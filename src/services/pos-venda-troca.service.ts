import {
  ITEM_SEM_IDENTIFICACAO,
  itemIdentificado,
  retornoDaTroca,
  temPendencia,
  validarQuantidadesTroca,
} from "@/features/pos-venda/itens";
// Importar módulos PUROS de features é o padrão vigente — `instalacao.service.ts`
// faz o mesmo com `features/instalacoes/endereco` e `labels`.
import type { DestinatarioTroca, StatusTroca } from "@/features/pos-venda/labels";
import { exigeDestinatarioNome } from "@/features/pos-venda/labels";
import { prisma } from "@/infrastructure/database";
import { contemBusca } from "@/utils";

import {
  INCLUDE_REGISTRO,
  ORDEM_TIMELINE,
  mapRegistro,
  type RegistroPosVendaDTO,
} from "./pos-venda-troca-registro.service";
import {
  assertUsuarioAtivo,
  listUsuarioOptionsAtivos,
  type UsuarioOption,
} from "./usuario.service";

/**
 * Serviço de Troca Antecipada (Sprint 4.6, ADR-0418).
 *
 * - A numeração vem da sequência do PostgreSQL, nunca do `id`.
 * - Toda escrita grava `TrocaAntecipadaAuditoria` na MESMA transação, como
 *   `proposta.service.ts` e `instalacao.service.ts`.
 * - `quantidadePendenteRetorno` NUNCA é lido do banco: é derivado no módulo
 *   puro `features/pos-venda/itens.ts`.
 * - Responsável é VÍNCULO com `Usuario`, **sem exigência de papel** (ADR-0422):
 *   basta estar ATIVO. Acompanhar uma troca é trabalho de envio, devolução,
 *   frete e cobrança — frequentemente administrativo. Exigir `ehTecnico` aqui
 *   limitaria o cadastro sem razão de negócio. A Ordem de Serviço, essa sim,
 *   continua exigindo técnico: lá o trabalho é análise e reparo.
 *   Nenhum papel novo foi criado.
 * - **Custos da Troca não se misturam com os da OS.** Nenhuma função aqui
 *   enxerga a OS; o total acumulado é só desta Troca.
 */

export type { StatusTroca, DestinatarioTroca };

export const TROCA_NAO_ENCONTRADA = "Troca antecipada não encontrada.";
export const CLIENTE_NAO_ENCONTRADO = "Cliente não encontrado.";
export const ITEM_NAO_ENCONTRADO =
  "Item não encontrado nesta troca antecipada.";
export const DESTINATARIO_NOME_OBRIGATORIO =
  "Informe para quem o produto foi enviado.";
export const TROCA_COM_PENDENCIA =
  "Ainda há produtos pendentes de devolução nesta troca.";
export const TROCA_JA_ENCERRADA =
  "Esta troca antecipada já foi finalizada ou cancelada.";

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export interface ItemTrocaDTO {
  id: string;
  produtoId: string | null;
  produtoCodigo: string | null;
  produtoDescricao: string | null;
  descricaoManual: string | null;
  quantidadeEnviada: number;
  quantidadeEsperadaRetorno: number;
  quantidadeDevolvida: number;
}

export interface TrocaListItem {
  id: string;
  numero: number;
  clienteNome: string;
  referencia: string;
  status: StatusTroca;
  responsavelNome: string | null;
  /** Somas dos itens — a coluna "Retorno" exibe `devolvido/esperado`. */
  devolvido: number;
  esperado: number;
  /** Custo acumulado DESTA troca. Nunca inclui custo de OS. */
  custoTotal: number;
  updatedAt: Date;
  /** Texto adicional pesquisável que não vira coluna (relato, produtos). */
  textoBusca: string;
}

export interface TrocaDetalhe {
  id: string;
  numero: number;
  clienteId: string;
  clienteNome: string;
  referencia: string;
  responsavelId: string | null;
  relatoInicial: string | null;
  status: StatusTroca;
  destinatarioTipo: DestinatarioTroca;
  destinatarioNome: string | null;
  diagnosticoConclusao: string | null;
  createdAt: Date;
  updatedAt: Date;
  finalizadaEm: Date | null;
  canceladaEm: Date | null;
  itens: ItemTrocaDTO[];
  /** Timeline já ordenada pelo service. */
  registros: RegistroPosVendaDTO[];
  /** OS vinculada, quando existe (ADR-0419: zero ou uma). */
  ordemServico: { id: string; numero: number } | null;
}

/** Campos que o chamador informa no cabeçalho. */
export interface TrocaInput {
  referencia: string;
  responsavelId: string | null;
  relatoInicial: string;
  status: StatusTroca;
  destinatarioTipo: DestinatarioTroca;
  destinatarioNome: string;
  diagnosticoConclusao: string;
}

export interface NovaTrocaInput {
  clienteId: string;
  referencia: string;
  responsavelId: string | null;
  relatoInicial: string;
  status: StatusTroca;
  destinatarioTipo: DestinatarioTroca;
  destinatarioNome: string;
}

/** Item como chega do editor. `id` ausente = linha nova. */
export interface ItemTrocaInput {
  id?: string | null;
  produtoId: string | null;
  descricaoManual: string;
  quantidadeEnviada: number;
  quantidadeEsperadaRetorno: number;
  quantidadeDevolvida: number;
}

/** Uma pendência, como o diálogo de confirmação forte a enumera. */
export interface PendenciaRetorno {
  descricao: string;
  esperado: number;
  devolvido: number;
  pendente: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const trimOrNull = (v?: string | null): string | null => {
  const t = v?.trim();
  return t ? t : null;
};

const toNumber = (v: { toString(): string }): number => Number(v.toString());

/** Nome do cliente para exibição — PJ mostra a razão social. */
const nomeCliente = (c: {
  tipoPessoa: string;
  nome: string | null;
  empresa: string | null;
}): string =>
  (c.tipoPessoa === "PJ" ? c.empresa || c.nome : c.nome || c.empresa) || "—";

const CLIENTE_SELECT = {
  tipoPessoa: true,
  nome: true,
  empresa: true,
} as const;

const ITEM_SELECT = {
  id: true,
  produtoId: true,
  descricaoManual: true,
  quantidadeEnviada: true,
  quantidadeEsperadaRetorno: true,
  quantidadeDevolvida: true,
  produto: { select: { codigo: true, descricao: true } },
} as const;

type LinhaItem = {
  id: string;
  produtoId: string | null;
  descricaoManual: string | null;
  quantidadeEnviada: number;
  quantidadeEsperadaRetorno: number;
  quantidadeDevolvida: number;
  produto: { codigo: string; descricao: string } | null;
};

function mapItem(i: LinhaItem): ItemTrocaDTO {
  return {
    id: i.id,
    produtoId: i.produtoId,
    produtoCodigo: i.produto?.codigo ?? null,
    produtoDescricao: i.produto?.descricao ?? null,
    descricaoManual: i.descricaoManual,
    quantidadeEnviada: i.quantidadeEnviada,
    quantidadeEsperadaRetorno: i.quantidadeEsperadaRetorno,
    quantidadeDevolvida: i.quantidadeDevolvida,
  };
}

/**
 * Valida o cabeçalho. Roda DENTRO do service, não só no Zod: a action é
 * fronteira pública e a integridade não pode depender de quem chamou.
 */
function validarCabecalho(input: {
  destinatarioTipo: DestinatarioTroca;
  destinatarioNome: string;
}): void {
  if (
    exigeDestinatarioNome(input.destinatarioTipo) &&
    !input.destinatarioNome.trim()
  ) {
    throw new Error(DESTINATARIO_NOME_OBRIGATORIO);
  }
}

/**
 * `destinatarioNome` só é gravado quando o tipo o exige.
 *
 * Trocar de INSTALADOR para CLIENTE **limpa** o nome, em vez de deixá-lo
 * pendurado: um nome de instalador guardado numa troca cujo destinatário é o
 * cliente seria exibido por qualquer leitura futura que esquecesse de checar o
 * tipo — e alguém sempre esquece.
 */
function nomeDoDestinatario(input: {
  destinatarioTipo: DestinatarioTroca;
  destinatarioNome: string;
}): string | null {
  return exigeDestinatarioNome(input.destinatarioTipo)
    ? trimOrNull(input.destinatarioNome)
    : null;
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

/**
 * Listagem. Carrega itens e custos porque as colunas "Retorno" e "Custo" são
 * DERIVADAS — não há contador guardado na Troca, e não deve haver.
 *
 * O filtro textual é em memória, pela fonte única `@/utils/busca` (ADR-0402):
 * o `ILIKE` do Prisma é insensível a caixa mas SENSÍVEL a acento. `textoBusca`
 * carrega o que é pesquisável e não vira coluna — relato inicial, produtos do
 * cadastro e descrições manuais (spec §18).
 */
export async function listTrocas(): Promise<TrocaListItem[]> {
  const rows = await prisma.trocaAntecipada.findMany({
    select: {
      id: true,
      numero: true,
      referencia: true,
      status: true,
      relatoInicial: true,
      updatedAt: true,
      cliente: { select: CLIENTE_SELECT },
      responsavel: { select: { nome: true } },
      itens: {
        select: {
          descricaoManual: true,
          quantidadeEsperadaRetorno: true,
          quantidadeDevolvida: true,
          produto: { select: { codigo: true, descricao: true } },
        },
      },
      registros: { select: { custos: { select: { valor: true } } } },
    },
    orderBy: { numero: "desc" },
  });

  return rows.map((t) => {
    const { devolvido, esperado } = retornoDaTroca(t.itens);
    const custoTotal =
      Math.round(
        t.registros
          .flatMap((r) => r.custos)
          .reduce((s, c) => s + toNumber(c.valor), 0) * 100,
      ) / 100;

    return {
      id: t.id,
      numero: t.numero,
      clienteNome: nomeCliente(t.cliente),
      referencia: t.referencia,
      status: t.status as StatusTroca,
      responsavelNome: t.responsavel?.nome ?? null,
      devolvido,
      esperado,
      custoTotal,
      updatedAt: t.updatedAt,
      textoBusca: [
        t.relatoInicial ?? "",
        ...t.itens.map((i) =>
          [i.produto?.codigo, i.produto?.descricao, i.descricaoManual]
            .filter(Boolean)
            .join(" "),
        ),
      ].join(" "),
    };
  });
}

export async function getTroca(id: string): Promise<TrocaDetalhe | null> {
  const t = await prisma.trocaAntecipada.findUnique({
    where: { id },
    include: {
      cliente: { select: CLIENTE_SELECT },
      itens: { select: ITEM_SELECT, orderBy: { createdAt: "asc" } },
      registros: { orderBy: ORDEM_TIMELINE, include: INCLUDE_REGISTRO },
      ordemServico: { select: { id: true, numero: true } },
    },
  });
  if (!t) return null;

  return {
    id: t.id,
    numero: t.numero,
    clienteId: t.clienteId,
    clienteNome: nomeCliente(t.cliente),
    referencia: t.referencia,
    responsavelId: t.responsavelId,
    relatoInicial: t.relatoInicial,
    status: t.status as StatusTroca,
    destinatarioTipo: t.destinatarioTipo as DestinatarioTroca,
    destinatarioNome: t.destinatarioNome,
    diagnosticoConclusao: t.diagnosticoConclusao,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    finalizadaEm: t.finalizadaEm,
    canceladaEm: t.canceladaEm,
    itens: t.itens.map(mapItem),
    registros: t.registros.map(mapRegistro),
    ordemServico: t.ordemServico,
  };
}

// ---------------------------------------------------------------------------
// Escrita do cabeçalho (sempre em transação, com auditoria)
// ---------------------------------------------------------------------------

export async function criarTroca(
  input: NovaTrocaInput,
): Promise<{ id: string; numero: number }> {
  validarCabecalho(input);

  return prisma.$transaction(async (tx) => {
    const cliente = await tx.cliente.findUnique({
      where: { id: input.clienteId },
      select: { id: true },
    });
    if (!cliente) throw new Error(CLIENTE_NAO_ENCONTRADO);

    // Vínculo NOVO exige apenas usuário ATIVO (ADR-0422). Nulo é permitido — a
    // troca pode nascer sem responsável definido, como a Instalação.
    if (input.responsavelId) {
      await assertUsuarioAtivo(tx, input.responsavelId);
    }

    const criada = await tx.trocaAntecipada.create({
      data: {
        clienteId: input.clienteId,
        referencia: input.referencia.trim(),
        responsavelId: input.responsavelId,
        relatoInicial: trimOrNull(input.relatoInicial),
        status: input.status,
        destinatarioTipo: input.destinatarioTipo,
        destinatarioNome: nomeDoDestinatario(input),
      },
      select: { id: true, numero: true },
    });

    await tx.trocaAntecipadaAuditoria.create({
      data: {
        trocaAntecipadaId: criada.id,
        evento: "CRIACAO",
        observacao: `Troca antecipada ${criada.numero} criada`,
      },
    });

    return criada;
  });
}

/**
 * Atualiza o cabeçalho. **Não toca no cliente** — como na Instalação, o
 * vínculo com o Cliente é definido na criação e não muda depois.
 */
export async function atualizarTroca(
  id: string,
  input: TrocaInput,
): Promise<void> {
  validarCabecalho(input);

  await prisma.$transaction(async (tx) => {
    const atual = await tx.trocaAntecipada.findUnique({
      where: { id },
      select: { status: true, responsavelId: true },
    });
    if (!atual) throw new Error(TROCA_NAO_ENCONTRADA);

    // A checagem roda só quando o responsável MUDA (ADR-0410/0422). Editar uma
    // troca cujo responsável foi inativado continua funcionando, e o vínculo
    // antigo é preservado em vez de zerado em silêncio.
    if (input.responsavelId && input.responsavelId !== atual.responsavelId) {
      await assertUsuarioAtivo(tx, input.responsavelId);
    }

    await tx.trocaAntecipada.update({
      where: { id },
      data: {
        referencia: input.referencia.trim(),
        responsavelId: input.responsavelId,
        relatoInicial: trimOrNull(input.relatoInicial),
        status: input.status,
        destinatarioTipo: input.destinatarioTipo,
        destinatarioNome: nomeDoDestinatario(input),
        diagnosticoConclusao: trimOrNull(input.diagnosticoConclusao),
      },
    });

    const mudouStatus = atual.status !== input.status;
    await tx.trocaAntecipadaAuditoria.create({
      data: {
        trocaAntecipadaId: id,
        evento: mudouStatus ? "MUDANCA_STATUS" : "ALTERACAO",
        observacao: mudouStatus ? `${atual.status} → ${input.status}` : null,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Itens
// ---------------------------------------------------------------------------

/**
 * Substitui a grade de produtos por RECONCILIAÇÃO, não por delete-and-recreate.
 *
 * A diferença importa: `createdAt` é o critério de ordem da grade, e recriar
 * tudo a cada salvamento faria as linhas dançarem de lugar sempre que alguém
 * corrigisse uma quantidade. Reconciliar preserva id e ordem.
 *
 * **Toda operação é condicionada ao `trocaAntecipadaId`.** Um `id` de item de
 * OUTRA troca não atualiza nem apaga nada — devolve `ITEM_NAO_ENCONTRADO`, a
 * mesma resposta de um id inexistente. É a mesma classe de invariante do
 * ADR-0409, e é a razão de o par cruzado ter teste de integração próprio.
 *
 * A validação roda ANTES de qualquer escrita: uma grade com uma linha inválida
 * não pode gravar as outras e recusar só a última.
 */
export async function salvarItensTroca(
  trocaId: string,
  itens: ItemTrocaInput[],
): Promise<void> {
  for (const item of itens) {
    if (
      !itemIdentificado({
        produtoId: item.produtoId,
        descricaoManual: item.descricaoManual,
      })
    ) {
      throw new Error(ITEM_SEM_IDENTIFICACAO);
    }
    const erro = validarQuantidadesTroca(item);
    if (erro) throw new Error(erro);
  }

  await prisma.$transaction(async (tx) => {
    const troca = await tx.trocaAntecipada.findUnique({
      where: { id: trocaId },
      select: { id: true, itens: { select: { id: true } } },
    });
    if (!troca) throw new Error(TROCA_NAO_ENCONTRADA);

    const existentes = new Set(troca.itens.map((i) => i.id));
    const mantidos = new Set<string>();

    for (const item of itens) {
      const dados = {
        // Descrição manual é gravada mesmo quando há produto: é complemento
        // digitado pelo usuário, e apagá-la seria descartar informação.
        produtoId: item.produtoId,
        descricaoManual: trimOrNull(item.descricaoManual),
        quantidadeEnviada: item.quantidadeEnviada,
        quantidadeEsperadaRetorno: item.quantidadeEsperadaRetorno,
        quantidadeDevolvida: item.quantidadeDevolvida,
      };

      if (item.id) {
        // Não pertencer à troca informada e não existir dão a MESMA resposta —
        // dizer "esse item é da troca 1050" vazaria a existência de um agregado
        // vizinho.
        if (!existentes.has(item.id)) throw new Error(ITEM_NAO_ENCONTRADO);
        await tx.trocaAntecipadaItem.update({
          where: { id: item.id },
          data: dados,
        });
        mantidos.add(item.id);
      } else {
        await tx.trocaAntecipadaItem.create({
          data: { trocaAntecipadaId: trocaId, ...dados },
        });
      }
    }

    const removidos = [...existentes].filter((id) => !mantidos.has(id));
    if (removidos.length > 0) {
      // As duas condições de novo, em vez de apagar por id já verificado: a
      // janela entre a leitura e a escrita não fica explorável.
      await tx.trocaAntecipadaItem.deleteMany({
        where: { id: { in: removidos }, trocaAntecipadaId: trocaId },
      });
    }

    await tx.trocaAntecipadaAuditoria.create({
      data: {
        trocaAntecipadaId: trocaId,
        evento: "ALTERACAO",
        observacao: `Produtos da troca atualizados (${itens.length})`,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Finalização e cancelamento
// ---------------------------------------------------------------------------

/** Pendências de retorno da troca, como o diálogo de confirmação as enumera. */
export async function pendenciasDaTroca(
  id: string,
): Promise<PendenciaRetorno[]> {
  const itens = await prisma.trocaAntecipadaItem.findMany({
    where: { trocaAntecipadaId: id },
    select: ITEM_SELECT,
    orderBy: { createdAt: "asc" },
  });

  return itens
    .map(mapItem)
    .filter((i) => i.quantidadeEsperadaRetorno > i.quantidadeDevolvida)
    .map((i) => ({
      descricao:
        [i.produtoCodigo, i.produtoDescricao].filter(Boolean).join(" — ") ||
        i.descricaoManual ||
        "—",
      esperado: i.quantidadeEsperadaRetorno,
      devolvido: i.quantidadeDevolvida,
      pendente: i.quantidadeEsperadaRetorno - i.quantidadeDevolvida,
    }));
}

/**
 * Finaliza a troca. Ação EXPLÍCITA — nunca um efeito colateral de salvar.
 *
 * ── A CONFIRMAÇÃO FORTE (spec §12) ──────────────────────────────────────────
 * Havendo item com `devolvida < esperada`, a finalização exige
 * `confirmarPendencia: true`. **Isto não é um bloqueio.** Produto perdido,
 * acordo comercial, cobrança futura e decisão administrativa são desfechos
 * reais, e um bloqueio absoluto empurraria o usuário a inventar uma devolução
 * que não houve — que é pior do que registrar a pendência e fechar.
 *
 * Sem a confirmação, o erro carrega a lista de pendências no texto: é o que a
 * interface mostra no diálogo, e o que um chamador não-interativo precisa ler.
 */
export async function finalizarTroca(
  id: string,
  confirmarPendencia = false,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const troca = await tx.trocaAntecipada.findUnique({
      where: { id },
      select: {
        status: true,
        itens: {
          select: {
            quantidadeEsperadaRetorno: true,
            quantidadeDevolvida: true,
          },
        },
      },
    });
    if (!troca) throw new Error(TROCA_NAO_ENCONTRADA);
    if (troca.status === "CANCELADA") throw new Error(TROCA_JA_ENCERRADA);

    if (temPendencia(troca.itens) && !confirmarPendencia) {
      throw new Error(TROCA_COM_PENDENCIA);
    }

    await tx.trocaAntecipada.update({
      where: { id },
      data: {
        status: "FINALIZADA",
        // Carimbado só na PRIMEIRA finalização — nunca sobrescrito, como
        // `Proposta.emitidaAt`. Refinalizar uma troca reaberta não reescreve o
        // dia em que ela foi encerrada pela primeira vez.
        finalizadaEm: troca.status === "FINALIZADA" ? undefined : new Date(),
      },
    });

    await tx.trocaAntecipadaAuditoria.create({
      data: {
        trocaAntecipadaId: id,
        evento: "FINALIZACAO",
        observacao: temPendencia(troca.itens)
          ? "Finalizada COM pendência de devolução, confirmada pelo usuário"
          : "Finalizada com retorno completo",
      },
    });
  });
}

/** Cancela preservando o histórico — troca nunca some (spec §42). */
export async function cancelarTroca(
  id: string,
  motivo: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const atual = await tx.trocaAntecipada.findUnique({
      where: { id },
      select: { status: true, canceladaEm: true },
    });
    if (!atual) throw new Error(TROCA_NAO_ENCONTRADA);

    await tx.trocaAntecipada.update({
      where: { id },
      data: {
        status: "CANCELADA",
        canceladaEm: atual.canceladaEm ?? new Date(),
      },
    });
    await tx.trocaAntecipadaAuditoria.create({
      data: {
        trocaAntecipadaId: id,
        evento: "CANCELAMENTO",
        observacao: trimOrNull(motivo),
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Opções e busca auxiliar
// ---------------------------------------------------------------------------

/**
 * Opções do `Select` de responsável para UMA troca: **todos os usuários ativos**
 * (ADR-0422) mais os já vinculados a ela — o responsável atual e o de cada
 * registro —, ainda que inativos.
 *
 * Sem os vinculados, abrir uma troca cujo responsável foi inativado mostraria o
 * campo em branco, e salvar qualquer outra alteração apagaria o vínculo em
 * silêncio. Mesma estrutura de `listUsuarioOptionsDaInstalacao`, sem o eixo de
 * papel.
 */
export async function listUsuarioOptionsDaTroca(
  trocaId: string,
): Promise<UsuarioOption[]> {
  const t = await prisma.trocaAntecipada.findUnique({
    where: { id: trocaId },
    select: {
      responsavelId: true,
      registros: { select: { responsavelId: true } },
    },
  });
  if (!t) return listUsuarioOptionsAtivos();

  return listUsuarioOptionsAtivos([
    ...(t.responsavelId ? [t.responsavelId] : []),
    ...t.registros.map((r) => r.responsavelId),
  ]);
}

export interface TrocaSuggestion {
  id: string;
  label: string;
  sublabel: string;
}

/**
 * Trocas de um cliente, para o vínculo opcional da OS (spec §26).
 *
 * Filtra pelo cliente selecionado — é o que torna a lista curta o bastante para
 * um `Select` simples, sem transformar a tela de criação da OS num buscador.
 *
 * **Trocas que JÁ têm OS não aparecem**: a cardinalidade é zero-ou-uma
 * (ADR-0419), e oferecer uma opção que o banco vai recusar é pior do que não
 * oferecer. A constraint continua sendo a garantia; isto é cortesia.
 */
export async function listTrocasVinculaveis(
  clienteId: string,
): Promise<TrocaSuggestion[]> {
  if (!clienteId) return [];

  const rows = await prisma.trocaAntecipada.findMany({
    where: { clienteId, ordemServico: null },
    select: { id: true, numero: true, referencia: true, status: true },
    orderBy: { numero: "desc" },
  });

  return rows.map((t) => ({
    id: t.id,
    label: `Troca ${t.numero}`,
    sublabel: t.referencia,
  }));
}

/** Filtro textual da listagem, aplicado sobre os campos da spec §18. */
export function filtrarTrocas(
  rows: TrocaListItem[],
  query: string,
): TrocaListItem[] {
  const q = query.trim();
  if (!q) return rows;
  return rows.filter((t) =>
    contemBusca(
      [
        String(t.numero),
        t.clienteNome,
        t.referencia,
        t.responsavelNome ?? "",
        t.textoBusca,
      ].join(" "),
      q,
    ),
  );
}
