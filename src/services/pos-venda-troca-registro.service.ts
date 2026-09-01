import type { CategoriaCustoPosVenda } from "@/features/pos-venda/labels";
import { prisma } from "@/infrastructure/database";

import { removerPastaDoRegistro } from "./pos-venda-anexo.service";
import { USUARIO_INATIVO } from "./usuario.service";

/**
 * Timeline da Troca Antecipada (Sprint 4.6).
 *
 * Espelha `instalacao-registro.service.ts`, com entidades PRÓPRIAS — nenhuma FK
 * aponta para `Instalacao`, e nenhuma função é compartilhada com aquele módulo.
 * A repetição de estrutura é deliberada: os dois agregados têm literalmente a
 * mesma mecânica de timeline, e o custo de uma abstração genérica sobre dois
 * delegates diferentes do Prisma seria maior que o da simetria.
 *
 * Invariantes, os mesmos de lá:
 *
 * - registro + custos numa ÚNICA transação — falhou um custo, o registro não
 *   permanece;
 * - na edição os custos usam delete-and-recreate dentro da transação;
 * - NENHUM total é persistido: o cálculo é do módulo puro `custos.ts`;
 * - estas operações **não** gravam auditoria (ADR-0401): timeline operacional e
 *   trilha técnica são mecanismos separados;
 * - **pertencimento ao agregado**: editar ou excluir exige que o registro seja
 *   DA troca informada. A consulta é sempre condicionada por `id` E
 *   `trocaAntecipadaId`; não pertencer devolve o mesmo "não encontrado" de um
 *   id inexistente (ADR-0409);
 * - o responsável é VÍNCULO + SNAPSHOT do nome (ADR-0408), derivado aqui
 *   dentro, do `Usuario` persistido, e reescrito só quando o responsável MUDA;
 * - **sem exigência de papel** (ADR-0422): basta o usuário estar ATIVO. Um
 *   acontecimento da timeline da Troca é tipicamente administrativo — "enviado
 *   por motoboy", "postado", "cliente cobrado pela devolução", "frete R$ 60" —,
 *   e exigir técnico para registrar isso não descreveria o trabalho real. A
 *   timeline da ORDEM DE SERVIÇO continua exigindo técnico: lá o registro é de
 *   análise e reparo.
 */

export interface CustoPosVendaDTO {
  id: string;
  categoria: CategoriaCustoPosVenda;
  descricao: string | null;
  valor: number;
}

/** Metadados de um anexo, como a timeline os exibe. */
export interface AnexoPosVendaDTO {
  id: string;
  nomeOriginal: string;
  mimeType: string;
  tamanho: number;
  createdAt: Date;
}

export interface RegistroPosVendaDTO {
  id: string;
  dataHora: Date;
  responsavelId: string;
  /** Nome do responsável quando ELE foi atribuído a este registro. */
  responsavelNome: string;
  relato: string;
  createdAt: Date;
  custos: CustoPosVendaDTO[];
  /** Metadados apenas — o conteúdo é servido pela rota de download. */
  anexos: AnexoPosVendaDTO[];
}

export interface CustoPosVendaInput {
  categoria: CategoriaCustoPosVenda;
  descricao: string;
  valor: number;
}

export interface RegistroPosVendaInput {
  dataHora: Date;
  responsavelId: string;
  relato: string;
  custos: CustoPosVendaInput[];
}

/**
 * Registro inalcançável — inexistente OU fora do agregado informado. A mensagem
 * é a MESMA nos dois casos, de propósito (ADR-0409).
 *
 * Não reusa `REGISTRO_NAO_ENCONTRADO` de `@/lib/messages` porque aquela é a
 * mensagem da cronologia de Instalações: mesmo texto hoje, domínios distintos.
 * Compartilhar a constante amarraria os dois módulos a nunca divergirem o
 * vocabulário — o que ninguém decidiu.
 */
export const REGISTRO_TROCA_NAO_ENCONTRADO =
  "Registro não encontrado nesta troca antecipada.";
export const USUARIO_NAO_ENCONTRADO = "Usuário não encontrado.";
/**
 * Reexportado de `usuario.service` para que o teste e o chamador leiam a mesma
 * constante. **Não é `SEM_PAPEL_TECNICO`**: a timeline da Troca não exige papel
 * (ADR-0422) — a única recusa possível é usuário inativo.
 */
export { USUARIO_INATIVO };
export const REGISTRO_COM_CUSTOS =
  "Este registro possui custos lançados e não pode ser excluído. " +
  "Edite o registro para corrigir os custos.";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Nome do Usuário PERSISTIDO, lido dentro da transação, com a disponibilidade
 * checada na MESMA leitura.
 *
 * O nome NUNCA vem do navegador — mesma regra do snapshot de endereço
 * (ADR-0400): uma garantia de integridade não pode depender do estado de um
 * formulário. A checagem entra aqui, e não numa consulta separada, porque as
 * duas respostas precisam vir do mesmo estado (ADR-0410).
 *
 * **Só `ativo` é exigido** (ADR-0422). Não confundir com a timeline da Ordem de
 * Serviço, que continua exigindo `ehTecnico`.
 */
async function nomeDoResponsavel(tx: Tx, usuarioId: string): Promise<string> {
  const u = await tx.usuario.findUnique({
    where: { id: usuarioId },
    select: { nome: true, ativo: true },
  });
  if (!u) throw new Error(USUARIO_NAO_ENCONTRADO);
  if (!u.ativo) throw new Error(USUARIO_INATIVO);
  return u.nome;
}

const trimOrNull = (v?: string | null): string | null => {
  const t = v?.trim();
  return t ? t : null;
};

const toNumber = (v: { toString(): string }): number => Number(v.toString());

/**
 * Ordenação da timeline, em três níveis:
 *
 *   dataHora  desc — o FATO, não o cadastro. Ordenar por createdAt colocaria um
 *                    registro criado hoje acima de um fato de ontem.
 *   createdAt desc — desempate quando dois fatos compartilham o instante.
 *   id        desc — desempate TÉCNICO final. Sem ele, dois registros com
 *                    dataHora e createdAt idênticos sairiam em ordem indefinida
 *                    do PostgreSQL, e a mesma consulta poderia devolver ordens
 *                    diferentes entre execuções.
 */
export const ORDEM_TIMELINE = [
  { dataHora: "desc" as const },
  { createdAt: "desc" as const },
  { id: "desc" as const },
];

/** Custos e anexos sempre na ordem em que foram lançados. */
export const INCLUDE_REGISTRO = {
  custos: { orderBy: { createdAt: "asc" as const } },
  anexos: { orderBy: { createdAt: "asc" as const } },
} as const;

type LinhaRegistro = {
  id: string;
  dataHora: Date;
  responsavelId: string;
  responsavelNome: string;
  relato: string;
  createdAt: Date;
  custos: {
    id: string;
    categoria: string;
    descricao: string | null;
    valor: { toString(): string };
  }[];
  anexos: {
    id: string;
    nomeOriginal: string;
    mimeType: string;
    tamanho: number;
    createdAt: Date;
  }[];
};

export function mapRegistro(r: LinhaRegistro): RegistroPosVendaDTO {
  return {
    id: r.id,
    dataHora: r.dataHora,
    responsavelId: r.responsavelId,
    responsavelNome: r.responsavelNome,
    relato: r.relato,
    createdAt: r.createdAt,
    custos: r.custos.map((c) => ({
      id: c.id,
      categoria: c.categoria as CategoriaCustoPosVenda,
      descricao: c.descricao,
      valor: toNumber(c.valor),
    })),
    anexos: r.anexos.map((a) => ({
      id: a.id,
      nomeOriginal: a.nomeOriginal,
      mimeType: a.mimeType,
      tamanho: a.tamanho,
      createdAt: a.createdAt,
    })),
  };
}

export async function listarRegistrosTroca(
  trocaId: string,
): Promise<RegistroPosVendaDTO[]> {
  const rows = await prisma.trocaAntecipadaRegistro.findMany({
    where: { trocaAntecipadaId: trocaId },
    orderBy: ORDEM_TIMELINE,
    include: INCLUDE_REGISTRO,
  });
  return rows.map(mapRegistro);
}

export async function criarRegistroTroca(
  trocaId: string,
  input: RegistroPosVendaInput,
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    const troca = await tx.trocaAntecipada.findUnique({
      where: { id: trocaId },
      select: { id: true },
    });
    if (!troca) throw new Error(REGISTRO_TROCA_NAO_ENCONTRADO);

    const responsavelNome = await nomeDoResponsavel(tx, input.responsavelId);

    const criado = await tx.trocaAntecipadaRegistro.create({
      data: {
        trocaAntecipadaId: trocaId,
        dataHora: input.dataHora,
        responsavelId: input.responsavelId,
        responsavelNome,
        relato: input.relato.trim(),
      },
      select: { id: true },
    });

    for (const custo of input.custos) {
      await tx.trocaAntecipadaRegistroCusto.create({
        data: {
          registroId: criado.id,
          categoria: custo.categoria,
          descricao: trimOrNull(custo.descricao),
          valor: custo.valor,
        },
      });
    }

    return criado;
  });
}

/**
 * Edição: substitui os custos por completo, na mesma transação.
 *
 * O registro é carregado **condicionado à troca** (`id` E `trocaAntecipadaId`).
 * Sem isso, uma chamada com o id da troca A e o registro de B editaria o
 * histórico de B. A checagem acontece ANTES do delete-and-recreate: invertida,
 * uma tentativa cruzada apagaria os custos do registro alvo antes de ser
 * recusada.
 */
export async function atualizarRegistroTroca(
  trocaId: string,
  id: string,
  input: RegistroPosVendaInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const atual = await tx.trocaAntecipadaRegistro.findFirst({
      where: { id, trocaAntecipadaId: trocaId },
      select: { id: true, responsavelId: true },
    });
    if (!atual) throw new Error(REGISTRO_TROCA_NAO_ENCONTRADO);

    // A REGRA (ADR-0408): `responsavelNome` é o nome de quem constava como
    // responsável quando ELE foi atribuído — não o nome que o usuário tem na
    // última edição de qualquer campo. Corrigir o relato de um fato antigo não
    // pode reescrever quem constava naquele dia.
    //
    // `undefined` faz o Prisma NÃO tocar na coluna. Não confundir com `null`.
    const trocouResponsavel = atual.responsavelId !== input.responsavelId;
    const responsavelNome = trocouResponsavel
      ? await nomeDoResponsavel(tx, input.responsavelId)
      : undefined;

    await tx.trocaAntecipadaRegistro.update({
      where: { id },
      data: {
        dataHora: input.dataHora,
        responsavelId: input.responsavelId,
        responsavelNome,
        relato: input.relato.trim(),
      },
    });

    await tx.trocaAntecipadaRegistroCusto.deleteMany({
      where: { registroId: id },
    });
    for (const custo of input.custos) {
      await tx.trocaAntecipadaRegistroCusto.create({
        data: {
          registroId: id,
          categoria: custo.categoria,
          descricao: trimOrNull(custo.descricao),
          valor: custo.valor,
        },
      });
    }
  });
}

/**
 * Exclusão: permitida apenas quando o registro pertence à troca informada E não
 * tem custos.
 *
 * A ordem importa. Primeiro o pertencimento, depois os custos: um registro de
 * outra troca nem chega a ser avaliado quanto a custos, e a resposta é a mesma
 * de "não encontrado".
 *
 * A checagem de custos é aqui, não na interface: o `ON DELETE CASCADE` do banco
 * apagaria os custos junto, que é justamente o que a regra impede (ADR-0401).
 */
export async function excluirRegistroTroca(
  trocaId: string,
  id: string,
): Promise<void> {
  const registro = await prisma.trocaAntecipadaRegistro.findFirst({
    where: { id, trocaAntecipadaId: trocaId },
    select: { id: true, _count: { select: { custos: true } } },
  });
  if (!registro) throw new Error(REGISTRO_TROCA_NAO_ENCONTRADO);
  if (registro._count.custos > 0) throw new Error(REGISTRO_COM_CUSTOS);

  await prisma.trocaAntecipadaRegistro.deleteMany({
    where: { id, trocaAntecipadaId: trocaId },
  });

  /**
   * Anexos: as LINHAS já saíram por `ON DELETE CASCADE`; aqui some a pasta
   * física. **Depois do commit, e best-effort.** Falhar aqui deixa arquivos
   * órfãos — o lado tolerado do invariante. Apagar antes, ou dentro da
   * transação, arriscaria o oposto: um rollback deixaria linhas apontando para
   * arquivos que já não existem.
   */
  await removerPastaDoRegistro("TROCA", trocaId, id);
}
