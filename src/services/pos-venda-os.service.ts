import {
  ITEM_SEM_IDENTIFICACAO,
  NENHUM_ITEM_DEVOLVIDO,
  itemIdentificado,
  itensParaOS,
  validarQuantidadeOS,
} from "@/features/pos-venda/itens";
import type { OrigemOS, StatusOS } from "@/features/pos-venda/labels";
import { origemDe } from "@/features/pos-venda/labels";
import { prisma } from "@/infrastructure/database";
import { contemBusca } from "@/utils";

import {
  INCLUDE_REGISTRO_OS,
  ORDEM_TIMELINE_OS,
  mapRegistroOS,
  type RegistroPosVendaDTO,
} from "./pos-venda-os-registro.service";
import {
  assertPapel,
  listUsuarioOptions,
  type UsuarioOption,
} from "./usuario.service";

/**
 * Serviço da Ordem de Serviço de PÓS-VENDA / MANUTENÇÃO (Sprint 4.6).
 *
 * **Não é a OS de instalação.** Esta existe para analisar, reparar e registrar
 * o histórico técnico de produtos que voltaram — uma futura OS de instalação
 * será outra entidade, e nada aqui é preparado para ela.
 *
 * - Funciona COMPLETAMENTE sem Troca: a criação manual é o fluxo obrigatório.
 * - `origem` é DERIVADA de `trocaAntecipadaId` (ADR-0419) — não há coluna.
 * - Custos são próprios: **nunca** copiados da Troca, **nunca** somados com ela.
 * - Numeração por sequência do PostgreSQL, independente da Troca.
 */

export type { StatusOS, OrigemOS };

export const OS_NAO_ENCONTRADA = "Ordem de serviço não encontrada.";
export const CLIENTE_NAO_ENCONTRADO = "Cliente não encontrado.";
export const TROCA_NAO_ENCONTRADA = "Troca antecipada não encontrada.";
export const ITEM_NAO_ENCONTRADO = "Item não encontrado nesta ordem de serviço.";
export const TROCA_DE_OUTRO_CLIENTE =
  "A troca antecipada selecionada pertence a outro cliente.";
export const TROCA_JA_TEM_OS =
  "Esta troca antecipada já possui uma ordem de serviço vinculada.";
export const OS_SEM_INFORMACAO_TECNICA =
  "Para finalizar, registre a conclusão técnica geral " +
  "ou o diagnóstico/solução de pelo menos um produto.";
export const OS_JA_ENCERRADA = "Esta ordem de serviço já foi cancelada.";

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export interface ItemOSDTO {
  id: string;
  produtoId: string | null;
  produtoCodigo: string | null;
  produtoDescricao: string | null;
  descricaoManual: string | null;
  quantidade: number;
  diagnosticoItem: string | null;
  solucaoItem: string | null;
}

export interface OSListItem {
  id: string;
  numero: number;
  clienteNome: string;
  referencia: string;
  /** Derivada: `null` = Direta. Ver `rotuloOrigem` em `labels.ts`. */
  trocaNumero: number | null;
  trocaId: string | null;
  status: StatusOS;
  responsavelNome: string | null;
  /** Quantos produtos a OS tem (linhas, não somatório de quantidade). */
  produtos: number;
  /** Custo acumulado DESTA OS. Nunca inclui custo da Troca. */
  custoTotal: number;
  updatedAt: Date;
  /** Texto pesquisável que não vira coluna. */
  textoBusca: string;
}

export interface OSDetalhe {
  id: string;
  numero: number;
  clienteId: string;
  clienteNome: string;
  trocaAntecipadaId: string | null;
  trocaNumero: number | null;
  trocaReferencia: string | null;
  origem: OrigemOS;
  referencia: string;
  responsavelId: string | null;
  relatoInicial: string | null;
  status: StatusOS;
  diagnosticoConclusao: string | null;
  createdAt: Date;
  updatedAt: Date;
  finalizadaEm: Date | null;
  canceladaEm: Date | null;
  itens: ItemOSDTO[];
  registros: RegistroPosVendaDTO[];
}

export interface OSInput {
  referencia: string;
  responsavelId: string | null;
  relatoInicial: string;
  status: StatusOS;
  diagnosticoConclusao: string;
}

export interface NovaOSInput {
  clienteId: string;
  /** Vínculo OPCIONAL com uma Troca do MESMO cliente (spec §26). */
  trocaAntecipadaId: string | null;
  referencia: string;
  responsavelId: string | null;
  relatoInicial: string;
  status: StatusOS;
  /** Itens informados já na criação (a OS manual é o fluxo obrigatório). */
  itens: ItemOSInput[];
}

/** Item como chega do editor. `id` ausente = linha nova. */
export interface ItemOSInput {
  id?: string | null;
  produtoId: string | null;
  descricaoManual: string;
  quantidade: number;
  diagnosticoItem: string;
  solucaoItem: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const trimOrNull = (v?: string | null): string | null => {
  const t = v?.trim();
  return t ? t : null;
};

const toNumber = (v: { toString(): string }): number => Number(v.toString());

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
  quantidade: true,
  diagnosticoItem: true,
  solucaoItem: true,
  produto: { select: { codigo: true, descricao: true } },
} as const;

type LinhaItem = {
  id: string;
  produtoId: string | null;
  descricaoManual: string | null;
  quantidade: number;
  diagnosticoItem: string | null;
  solucaoItem: string | null;
  produto: { codigo: string; descricao: string } | null;
};

function mapItem(i: LinhaItem): ItemOSDTO {
  return {
    id: i.id,
    produtoId: i.produtoId,
    produtoCodigo: i.produto?.codigo ?? null,
    produtoDescricao: i.produto?.descricao ?? null,
    descricaoManual: i.descricaoManual,
    quantidade: i.quantidade,
    diagnosticoItem: i.diagnosticoItem,
    solucaoItem: i.solucaoItem,
  };
}

/** Valida a grade inteira ANTES de qualquer escrita. */
function validarItens(itens: ItemOSInput[]): void {
  for (const item of itens) {
    if (
      !itemIdentificado({
        produtoId: item.produtoId,
        descricaoManual: item.descricaoManual,
      })
    ) {
      throw new Error(ITEM_SEM_IDENTIFICACAO);
    }
    const erro = validarQuantidadeOS(item.quantidade);
    if (erro) throw new Error(erro);
  }
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Valida o vínculo opcional com a Troca, dentro da transação.
 *
 * Três recusas, todas com mensagem própria: troca inexistente, troca de OUTRO
 * cliente e troca que já tem OS. A terceira duplica o `@unique` do banco de
 * propósito — a constraint é a garantia final, mas o erro dela é ilegível para
 * quem está na tela.
 */
async function assertVinculoTroca(
  tx: Tx,
  trocaAntecipadaId: string,
  clienteId: string,
): Promise<void> {
  const troca = await tx.trocaAntecipada.findUnique({
    where: { id: trocaAntecipadaId },
    select: { clienteId: true, ordemServico: { select: { id: true } } },
  });
  if (!troca) throw new Error(TROCA_NAO_ENCONTRADA);
  if (troca.clienteId !== clienteId) throw new Error(TROCA_DE_OUTRO_CLIENTE);
  if (troca.ordemServico) throw new Error(TROCA_JA_TEM_OS);
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

export async function listOrdensServico(): Promise<OSListItem[]> {
  const rows = await prisma.ordemServicoPosVenda.findMany({
    select: {
      id: true,
      numero: true,
      referencia: true,
      status: true,
      relatoInicial: true,
      diagnosticoConclusao: true,
      updatedAt: true,
      cliente: { select: CLIENTE_SELECT },
      responsavel: { select: { nome: true } },
      trocaAntecipada: { select: { id: true, numero: true } },
      itens: {
        select: {
          descricaoManual: true,
          diagnosticoItem: true,
          solucaoItem: true,
          produto: { select: { codigo: true, descricao: true } },
        },
      },
      registros: { select: { custos: { select: { valor: true } } } },
    },
    orderBy: { numero: "desc" },
  });

  return rows.map((o) => {
    const custoTotal =
      Math.round(
        o.registros
          .flatMap((r) => r.custos)
          .reduce((s, c) => s + toNumber(c.valor), 0) * 100,
      ) / 100;

    return {
      id: o.id,
      numero: o.numero,
      clienteNome: nomeCliente(o.cliente),
      referencia: o.referencia,
      trocaNumero: o.trocaAntecipada?.numero ?? null,
      trocaId: o.trocaAntecipada?.id ?? null,
      status: o.status as StatusOS,
      responsavelNome: o.responsavel?.nome ?? null,
      produtos: o.itens.length,
      custoTotal,
      updatedAt: o.updatedAt,
      // Busca da spec §39: relato, diagnóstico geral, produtos, descrições
      // manuais, diagnóstico/solução por item e o NÚMERO da troca vinculada.
      textoBusca: [
        o.relatoInicial ?? "",
        o.diagnosticoConclusao ?? "",
        o.trocaAntecipada ? `Troca ${o.trocaAntecipada.numero}` : "",
        ...o.itens.map((i) =>
          [
            i.produto?.codigo,
            i.produto?.descricao,
            i.descricaoManual,
            i.diagnosticoItem,
            i.solucaoItem,
          ]
            .filter(Boolean)
            .join(" "),
        ),
      ].join(" "),
    };
  });
}

export async function getOrdemServico(id: string): Promise<OSDetalhe | null> {
  const o = await prisma.ordemServicoPosVenda.findUnique({
    where: { id },
    include: {
      cliente: { select: CLIENTE_SELECT },
      trocaAntecipada: { select: { id: true, numero: true, referencia: true } },
      itens: { select: ITEM_SELECT, orderBy: { createdAt: "asc" } },
      registros: { orderBy: ORDEM_TIMELINE_OS, include: INCLUDE_REGISTRO_OS },
    },
  });
  if (!o) return null;

  return {
    id: o.id,
    numero: o.numero,
    clienteId: o.clienteId,
    clienteNome: nomeCliente(o.cliente),
    trocaAntecipadaId: o.trocaAntecipadaId,
    trocaNumero: o.trocaAntecipada?.numero ?? null,
    trocaReferencia: o.trocaAntecipada?.referencia ?? null,
    // DERIVADA, sempre — nunca lida de coluna (ADR-0419).
    origem: origemDe(o.trocaAntecipadaId),
    referencia: o.referencia,
    responsavelId: o.responsavelId,
    relatoInicial: o.relatoInicial,
    status: o.status as StatusOS,
    diagnosticoConclusao: o.diagnosticoConclusao,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    finalizadaEm: o.finalizadaEm,
    canceladaEm: o.canceladaEm,
    itens: o.itens.map(mapItem),
    registros: o.registros.map(mapRegistroOS),
  };
}

// ---------------------------------------------------------------------------
// Escrita
// ---------------------------------------------------------------------------

/**
 * Criação MANUAL — o fluxo obrigatório desta Sprint (spec §24).
 *
 * Os itens entram junto: a OS de pós-venda nasce porque **um produto** chegou
 * para análise, e uma OS sem produto não descreve nada. O vínculo com a Troca é
 * opcional e, quando presente, precisa ser do mesmo cliente.
 */
export async function criarOrdemServico(
  input: NovaOSInput,
): Promise<{ id: string; numero: number }> {
  validarItens(input.itens);

  return prisma.$transaction(async (tx) => {
    const cliente = await tx.cliente.findUnique({
      where: { id: input.clienteId },
      select: { id: true },
    });
    if (!cliente) throw new Error(CLIENTE_NAO_ENCONTRADO);

    if (input.trocaAntecipadaId) {
      await assertVinculoTroca(tx, input.trocaAntecipadaId, input.clienteId);
    }

    if (input.responsavelId) {
      await assertPapel(tx, input.responsavelId, "ehTecnico");
    }

    const criada = await tx.ordemServicoPosVenda.create({
      data: {
        clienteId: input.clienteId,
        trocaAntecipadaId: input.trocaAntecipadaId,
        referencia: input.referencia.trim(),
        responsavelId: input.responsavelId,
        relatoInicial: trimOrNull(input.relatoInicial),
        status: input.status,
        itens: {
          create: input.itens.map((i) => ({
            produtoId: i.produtoId,
            descricaoManual: trimOrNull(i.descricaoManual),
            quantidade: i.quantidade,
            diagnosticoItem: trimOrNull(i.diagnosticoItem),
            solucaoItem: trimOrNull(i.solucaoItem),
          })),
        },
      },
      select: { id: true, numero: true },
    });

    await tx.ordemServicoPosVendaAuditoria.create({
      data: {
        ordemServicoId: criada.id,
        evento: "CRIACAO",
        observacao: `Ordem de serviço ${criada.numero} criada`,
      },
    });

    // O vínculo é registrado nos DOIS lados: quem abrir a Troca amanhã precisa
    // ver que uma OS saiu dali, sem depender de olhar a outra tabela.
    if (input.trocaAntecipadaId) {
      await tx.ordemServicoPosVendaAuditoria.create({
        data: {
          ordemServicoId: criada.id,
          evento: "VINCULO",
          observacao: "Vinculada a uma troca antecipada na criação",
        },
      });
      await tx.trocaAntecipadaAuditoria.create({
        data: {
          trocaAntecipadaId: input.trocaAntecipadaId,
          evento: "VINCULO",
          observacao: `Ordem de serviço ${criada.numero} vinculada`,
        },
      });
    }

    return criada;
  });
}

/**
 * Atualiza o cabeçalho. **Não toca no cliente nem no vínculo com a Troca** — os
 * dois são definidos na criação.
 *
 * O vínculo especificamente: mudá-lo depois transformaria a origem de um fato
 * histórico ("esta OS nasceu daquela troca") em um campo editável, e o snapshot
 * dos itens deixaria de corresponder à troca apontada.
 */
export async function atualizarOrdemServico(
  id: string,
  input: OSInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const atual = await tx.ordemServicoPosVenda.findUnique({
      where: { id },
      select: { status: true, responsavelId: true },
    });
    if (!atual) throw new Error(OS_NAO_ENCONTRADA);

    if (input.responsavelId && input.responsavelId !== atual.responsavelId) {
      await assertPapel(tx, input.responsavelId, "ehTecnico");
    }

    await tx.ordemServicoPosVenda.update({
      where: { id },
      data: {
        referencia: input.referencia.trim(),
        responsavelId: input.responsavelId,
        relatoInicial: trimOrNull(input.relatoInicial),
        status: input.status,
        diagnosticoConclusao: trimOrNull(input.diagnosticoConclusao),
      },
    });

    const mudouStatus = atual.status !== input.status;
    await tx.ordemServicoPosVendaAuditoria.create({
      data: {
        ordemServicoId: id,
        evento: mudouStatus ? "MUDANCA_STATUS" : "ALTERACAO",
        observacao: mudouStatus ? `${atual.status} → ${input.status}` : null,
      },
    });
  });
}

/**
 * Reconciliação da grade de produtos — mesma mecânica e mesmo motivo da Troca:
 * `createdAt` é o critério de ordem, e recriar tudo faria as linhas dançarem.
 *
 * Toda operação é condicionada ao `ordemServicoId`; um id de item de OUTRA OS
 * devolve `ITEM_NAO_ENCONTRADO`, a mesma resposta de um id inexistente.
 */
export async function salvarItensOS(
  ordemServicoId: string,
  itens: ItemOSInput[],
): Promise<void> {
  validarItens(itens);

  await prisma.$transaction(async (tx) => {
    const os = await tx.ordemServicoPosVenda.findUnique({
      where: { id: ordemServicoId },
      select: { id: true, itens: { select: { id: true } } },
    });
    if (!os) throw new Error(OS_NAO_ENCONTRADA);

    const existentes = new Set(os.itens.map((i) => i.id));
    const mantidos = new Set<string>();

    for (const item of itens) {
      const dados = {
        produtoId: item.produtoId,
        descricaoManual: trimOrNull(item.descricaoManual),
        quantidade: item.quantidade,
        diagnosticoItem: trimOrNull(item.diagnosticoItem),
        solucaoItem: trimOrNull(item.solucaoItem),
      };

      if (item.id) {
        if (!existentes.has(item.id)) throw new Error(ITEM_NAO_ENCONTRADO);
        await tx.ordemServicoPosVendaItem.update({
          where: { id: item.id },
          data: dados,
        });
        mantidos.add(item.id);
      } else {
        await tx.ordemServicoPosVendaItem.create({
          data: { ordemServicoId, ...dados },
        });
      }
    }

    const removidos = [...existentes].filter((id) => !mantidos.has(id));
    if (removidos.length > 0) {
      await tx.ordemServicoPosVendaItem.deleteMany({
        where: { id: { in: removidos }, ordemServicoId },
      });
    }

    await tx.ordemServicoPosVendaAuditoria.create({
      data: {
        ordemServicoId,
        evento: "ALTERACAO",
        observacao: `Produtos da ordem de serviço atualizados (${itens.length})`,
      },
    });
  });
}

/**
 * Finaliza a OS. Ação EXPLÍCITA, com **guarda de informação técnica**
 * (ADR-0420).
 *
 * A OS existe para responder "qual era o defeito, e o que foi feito". Finalizar
 * sem nada disso deixaria exatamente o buraco que o módulo veio fechar — o
 * histórico técnico que hoje se perde no WhatsApp.
 *
 * A regra é a mais frouxa que ainda garante o registro:
 *
 *   `diagnosticoConclusao` geral preenchido
 *   OU ao menos um item com `diagnosticoItem` ou `solucaoItem`
 *
 * Não é um bloqueio arbitrário: o campo geral é um textarea no próprio
 * workspace, e a mensagem de recusa diz exatamente o que falta. Diferente da
 * Troca, aqui NÃO há confirmação para pular — pendência de devolução tem
 * desfechos legítimos fora do sistema (perda, acordo), enquanto "consertamos e
 * ninguém sabe o quê" não é um desfecho, é informação perdida.
 */
export async function finalizarOrdemServico(id: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const os = await tx.ordemServicoPosVenda.findUnique({
      where: { id },
      select: {
        status: true,
        diagnosticoConclusao: true,
        itens: { select: { diagnosticoItem: true, solucaoItem: true } },
      },
    });
    if (!os) throw new Error(OS_NAO_ENCONTRADA);
    if (os.status === "CANCELADA") throw new Error(OS_JA_ENCERRADA);

    const temGeral = Boolean(os.diagnosticoConclusao?.trim());
    const temPorItem = os.itens.some(
      (i) => Boolean(i.diagnosticoItem?.trim()) || Boolean(i.solucaoItem?.trim()),
    );
    if (!temGeral && !temPorItem) {
      throw new Error(OS_SEM_INFORMACAO_TECNICA);
    }

    await tx.ordemServicoPosVenda.update({
      where: { id },
      data: {
        status: "FINALIZADA",
        // Carimbado só na PRIMEIRA finalização, nunca sobrescrito.
        finalizadaEm: os.status === "FINALIZADA" ? undefined : new Date(),
      },
    });

    await tx.ordemServicoPosVendaAuditoria.create({
      data: {
        ordemServicoId: id,
        evento: "FINALIZACAO",
        observacao: temGeral
          ? "Finalizada com conclusão técnica geral"
          : "Finalizada com diagnóstico/solução por produto",
      },
    });
  });
}

/** Cancela preservando o histórico — OS nunca some (spec §42). */
export async function cancelarOrdemServico(
  id: string,
  motivo: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const atual = await tx.ordemServicoPosVenda.findUnique({
      where: { id },
      select: { status: true, canceladaEm: true },
    });
    if (!atual) throw new Error(OS_NAO_ENCONTRADA);

    await tx.ordemServicoPosVenda.update({
      where: { id },
      data: {
        status: "CANCELADA",
        canceladaEm: atual.canceladaEm ?? new Date(),
      },
    });
    await tx.ordemServicoPosVendaAuditoria.create({
      data: {
        ordemServicoId: id,
        evento: "CANCELAMENTO",
        observacao: trimOrNull(motivo),
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Criação a partir de uma Troca (spec §27) — conveniência, não requisito
// ---------------------------------------------------------------------------

/**
 * Abre uma OS a partir de uma Troca Antecipada, pré-preenchida.
 *
 * ── O QUE É COPIADO, E O QUE ISSO SIGNIFICA ─────────────────────────────────
 * Cliente, vínculo, contexto na referência e os itens com
 * `quantidadeDevolvida > 0` — `produtoId` real preservado, item manual levando
 * a `descricaoManual`, e `quantidade` recebendo a devolvida **daquele
 * instante**.
 *
 * É um **SNAPSHOT** (ADR-0419). A Troca 7/7/5 gera uma OS de 5; quando a Troca
 * virar 7/7/7, a OS continua 5. Isso não é um efeito colateral aceito, é o
 * comportamento pretendido: a OS descreve o que chegou para análise, e o que
 * chegou depois é outro fato.
 *
 * **Não existe código de sincronização** — nem desligado, nem comentado, nem
 * atrás de flag. É isso que torna a garantia real: não há o que alguém possa
 * religar por engano.
 *
 * ── O QUE NÃO É COPIADO ─────────────────────────────────────────────────────
 * **Custos.** Frete e motoboy são da operação de troca; peça e mão de obra são
 * do reparo. Somá-los ou copiá-los produziria um número que não responde
 * pergunta nenhuma (spec §36).
 *
 * Timeline, anexos e diagnóstico da Troca também ficam onde estão.
 *
 * ── RECUSAS ─────────────────────────────────────────────────────────────────
 * Troca inexistente, troca que já tem OS, e — a que interessa ao usuário —
 * nenhum item devolvido ainda: aí não há o que analisar, e a mensagem diz o que
 * fazer antes de tentar de novo.
 */
export async function criarOSDaTroca(
  trocaId: string,
): Promise<{ id: string; numero: number }> {
  return prisma.$transaction(async (tx) => {
    const troca = await tx.trocaAntecipada.findUnique({
      where: { id: trocaId },
      select: {
        id: true,
        numero: true,
        clienteId: true,
        referencia: true,
        responsavelId: true,
        relatoInicial: true,
        ordemServico: { select: { id: true } },
        itens: {
          select: {
            produtoId: true,
            descricaoManual: true,
            quantidadeEsperadaRetorno: true,
            quantidadeDevolvida: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!troca) throw new Error(TROCA_NAO_ENCONTRADA);
    if (troca.ordemServico) throw new Error(TROCA_JA_TEM_OS);

    const itens = itensParaOS(troca.itens);
    if (itens.length === 0) throw new Error(NENHUM_ITEM_DEVOLVIDO);

    /**
     * O responsável da Troca é copiado APENAS se estiver disponível **para o
     * papel de técnico**. Um vínculo NOVO na OS exige o papel (ADR-0410), e
     * herdar em silêncio quem não o tem criaria justamente o vínculo que a
     * regra proíbe.
     *
     * Desde o ADR-0422 isto deixou de ser um caso de borda e virou o caminho
     * NORMAL: a Troca aceita qualquer usuário ativo, então o responsável dela é
     * frequentemente administrativo. Nesse caso a OS nasce **sem responsável** e
     * alguém escolhe o técnico — nunca é feita conversão automática para outro
     * usuário.
     */
    let responsavelId: string | null = null;
    if (troca.responsavelId) {
      const u = await tx.usuario.findUnique({
        where: { id: troca.responsavelId },
        select: { ativo: true, ehTecnico: true },
      });
      if (u?.ativo && u.ehTecnico) responsavelId = troca.responsavelId;
    }

    const criada = await tx.ordemServicoPosVenda.create({
      data: {
        clienteId: troca.clienteId,
        trocaAntecipadaId: troca.id,
        // A referência carrega o contexto de origem: quem abrir a OS daqui a
        // seis meses vê de onde ela veio sem precisar seguir o link.
        referencia: `${troca.referencia} (Troca ${troca.numero})`,
        responsavelId,
        relatoInicial: troca.relatoInicial,
        status: "AGUARDANDO_ANALISE",
        itens: {
          create: itens.map((i) => ({
            produtoId: i.produtoId,
            descricaoManual: i.descricaoManual,
            quantidade: i.quantidade,
          })),
        },
      },
      select: { id: true, numero: true },
    });

    await tx.ordemServicoPosVendaAuditoria.create({
      data: {
        ordemServicoId: criada.id,
        evento: "CRIACAO",
        observacao:
          `Ordem de serviço ${criada.numero} criada a partir da troca ` +
          `${troca.numero} (${itens.length} produto(s) devolvido(s))`,
      },
    });
    await tx.trocaAntecipadaAuditoria.create({
      data: {
        trocaAntecipadaId: troca.id,
        evento: "VINCULO",
        observacao: `Ordem de serviço ${criada.numero} aberta a partir desta troca`,
      },
    });

    return criada;
  });
}

// ---------------------------------------------------------------------------
// Opções e busca
// ---------------------------------------------------------------------------

/** Opções de responsável de UMA OS: disponíveis ∪ os já vinculados a ela. */
export async function listUsuarioOptionsDaOS(
  ordemServicoId: string,
): Promise<UsuarioOption[]> {
  const o = await prisma.ordemServicoPosVenda.findUnique({
    where: { id: ordemServicoId },
    select: {
      responsavelId: true,
      registros: { select: { responsavelId: true } },
    },
  });
  if (!o) return listUsuarioOptions("ehTecnico");

  return listUsuarioOptions("ehTecnico", [
    ...(o.responsavelId ? [o.responsavelId] : []),
    ...o.registros.map((r) => r.responsavelId),
  ]);
}

/** Filtro textual da listagem, sobre os campos da spec §39. */
export function filtrarOrdensServico(
  rows: OSListItem[],
  query: string,
): OSListItem[] {
  const q = query.trim();
  if (!q) return rows;
  return rows.filter((o) =>
    contemBusca(
      [
        String(o.numero),
        o.clienteNome,
        o.referencia,
        o.responsavelNome ?? "",
        o.textoBusca,
      ].join(" "),
      q,
    ),
  );
}
