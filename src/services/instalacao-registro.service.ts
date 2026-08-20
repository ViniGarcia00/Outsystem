import type { CategoriaCustoInstalacao } from "@/features/instalacoes/custos";
import type { TipoRegistroInstalacao } from "@/features/instalacoes/labels";
import { prisma } from "@/infrastructure/database";

/**
 * Cronologia operacional da Instalação (Sprint 4.0.2).
 *
 * - Registro + custos são escritos numa ÚNICA transação: falhou um custo, o
 *   registro não permanece.
 * - Na edição, os custos usam delete-and-recreate dentro da transação — mesmo
 *   padrão de PropostaServico em `proposta.service.ts`.
 * - NENHUM total é persistido: o cálculo é do módulo puro `custos.ts`.
 * - Estas operações NÃO gravam InstalacaoAuditoria (ADR-0401): cronologia
 *   operacional e trilha técnica são mecanismos separados.
 * - O responsável é VÍNCULO com Tecnico mais SNAPSHOT do nome (ADR-0408). O
 *   snapshot é derivado aqui dentro, do Tecnico persistido, e só é reescrito
 *   quando o técnico do registro MUDA — editar o relatório não mexe nele.
 */

export interface CustoDTO {
  id: string;
  categoria: CategoriaCustoInstalacao;
  descricao: string | null;
  valor: number;
}

export interface RegistroDTO {
  id: string;
  tipo: TipoRegistroInstalacao;
  aconteceuEm: Date;
  tecnicoId: string;
  /** Nome do responsável quando ELE foi atribuído a este registro. */
  responsavelNome: string;
  relatorio: string;
  createdAt: Date;
  custos: CustoDTO[];
}

export interface CustoInput {
  categoria: CategoriaCustoInstalacao;
  descricao: string;
  valor: number;
}

export interface RegistroInput {
  tipo: TipoRegistroInstalacao;
  aconteceuEm: Date;
  tecnicoId: string;
  relatorio: string;
  custos: CustoInput[];
}

export const REGISTRO_NAO_ENCONTRADO = "Registro não encontrado.";
export const TECNICO_NAO_ENCONTRADO = "Técnico não encontrado.";

/** Mensagem oficial do bloqueio de exclusão (ADR-0401). */
export const REGISTRO_COM_CUSTOS =
  "Este registro possui custos lançados e não pode ser excluído. " +
  "Edite o registro para corrigir os custos.";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Nome do Técnico PERSISTIDO, lido dentro da transação.
 *
 * O nome NUNCA vem do navegador — é a mesma regra do snapshot de endereço
 * (ADR-0400), e pelo mesmo motivo: uma garantia de integridade não pode depender
 * do estado de um formulário.
 */
async function nomeDoTecnico(tx: Tx, tecnicoId: string): Promise<string> {
  const t = await tx.tecnico.findUnique({
    where: { id: tecnicoId },
    select: { nome: true },
  });
  if (!t) throw new Error(TECNICO_NAO_ENCONTRADO);
  return t.nome;
}

const trimOrNull = (v?: string | null): string | null => {
  const t = v?.trim();
  return t ? t : null;
};

const toNumber = (v: { toString(): string }): number => Number(v.toString());

/**
 * Ordenação da timeline, em três níveis:
 *
 *   aconteceuEm desc  — o fato, não o cadastro. Ordenar por createdAt colocaria
 *                       um registro criado hoje acima de um fato de ontem.
 *   createdAt   desc  — desempate quando dois fatos compartilham o instante.
 *   id          desc  — desempate TÉCNICO final. Sem ele, dois registros com
 *                       aconteceuEm e createdAt idênticos sairiam em ordem
 *                       indefinida do PostgreSQL, e a mesma consulta poderia
 *                       devolver ordens diferentes entre execuções.
 *
 * O `id` (cuid) continua SEM significado comercial — é só critério de
 * determinismo, nunca exibido nem usado como numeração.
 */
export const ORDEM_TIMELINE = [
  { aconteceuEm: "desc" as const },
  { createdAt: "desc" as const },
  { id: "desc" as const },
];

/** Custos de um registro sempre na ordem em que foram lançados. */
export const INCLUDE_CUSTOS = {
  custos: { orderBy: { createdAt: "asc" as const } },
} as const;

type LinhaRegistro = {
  id: string;
  tipo: string;
  aconteceuEm: Date;
  tecnicoId: string;
  responsavelNome: string;
  relatorio: string;
  createdAt: Date;
  custos: {
    id: string;
    categoria: string;
    descricao: string | null;
    valor: { toString(): string };
  }[];
};

export function mapRegistro(r: LinhaRegistro): RegistroDTO {
  return {
    id: r.id,
    tipo: r.tipo as TipoRegistroInstalacao,
    aconteceuEm: r.aconteceuEm,
    tecnicoId: r.tecnicoId,
    responsavelNome: r.responsavelNome,
    relatorio: r.relatorio,
    createdAt: r.createdAt,
    custos: r.custos.map((c) => ({
      id: c.id,
      categoria: c.categoria as CategoriaCustoInstalacao,
      descricao: c.descricao,
      valor: toNumber(c.valor),
    })),
  };
}

export async function listarRegistros(
  instalacaoId: string,
): Promise<RegistroDTO[]> {
  const rows = await prisma.instalacaoRegistro.findMany({
    where: { instalacaoId },
    orderBy: ORDEM_TIMELINE,
    include: INCLUDE_CUSTOS,
  });
  return rows.map(mapRegistro);
}

export async function criarRegistro(
  instalacaoId: string,
  input: RegistroInput,
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    const responsavelNome = await nomeDoTecnico(tx, input.tecnicoId);

    const criado = await tx.instalacaoRegistro.create({
      data: {
        instalacaoId,
        tipo: input.tipo,
        aconteceuEm: input.aconteceuEm,
        tecnicoId: input.tecnicoId,
        responsavelNome,
        relatorio: input.relatorio.trim(),
      },
      select: { id: true },
    });

    for (const custo of input.custos) {
      await tx.instalacaoCusto.create({
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

/** Edição: substitui os custos por completo, dentro da mesma transação. */
export async function atualizarRegistro(
  id: string,
  input: RegistroInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const atual = await tx.instalacaoRegistro.findUnique({
      where: { id },
      select: { id: true, tecnicoId: true },
    });
    if (!atual) throw new Error(REGISTRO_NAO_ENCONTRADO);

    // A REGRA (ADR-0408): `responsavelNome` é o nome do responsável no momento
    // em que ELE foi atribuído a este registro — não o nome que o Técnico tinha
    // na última edição de qualquer campo.
    //
    // Corrigir o relatório de um fato antigo NÃO pode reescrever quem constava
    // como responsável naquele dia. Trocar o responsável, sim: aí o fato
    // operacional mudou, por decisão explícita de quem editou.
    //
    // `undefined` faz o Prisma NÃO tocar na coluna. Não confundir com `null`.
    const trocouTecnico = atual.tecnicoId !== input.tecnicoId;
    const responsavelNome = trocouTecnico
      ? await nomeDoTecnico(tx, input.tecnicoId)
      : undefined;

    await tx.instalacaoRegistro.update({
      where: { id },
      data: {
        tipo: input.tipo,
        aconteceuEm: input.aconteceuEm,
        tecnicoId: input.tecnicoId,
        responsavelNome,
        relatorio: input.relatorio.trim(),
      },
    });

    await tx.instalacaoCusto.deleteMany({ where: { registroId: id } });
    for (const custo of input.custos) {
      await tx.instalacaoCusto.create({
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
 * Exclusão: permitida apenas quando o registro NÃO tem custos.
 *
 * A checagem é aqui, não na interface: o `onDelete: Cascade` do banco apagaria
 * os custos junto, que é justamente o que a regra impede (ADR-0401).
 */
export async function excluirRegistro(id: string): Promise<void> {
  const custos = await prisma.instalacaoCusto.count({
    where: { registroId: id },
  });
  if (custos > 0) throw new Error(REGISTRO_COM_CUSTOS);

  await prisma.instalacaoRegistro.delete({ where: { id } });
}
