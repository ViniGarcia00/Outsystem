import type { CategoriaCustoPosVenda } from "@/features/pos-venda/labels";
import { LABEL_PAPEL } from "@/features/usuarios/opcoes";
import { prisma } from "@/infrastructure/database";

import { removerPastaDoRegistro } from "./pos-venda-anexo.service";
import type {
  RegistroPosVendaDTO,
  RegistroPosVendaInput,
} from "./pos-venda-troca-registro.service";

/**
 * Timeline da Ordem de Serviço de pós-venda (Sprint 4.6).
 *
 * Gêmeo de `pos-venda-troca-registro.service.ts`, com tabelas próprias. A
 * simetria é deliberada: os dois agregados têm a mesma mecânica de timeline, e
 * uma abstração genérica sobre dois delegates diferentes do Prisma custaria
 * mais legibilidade do que a repetição custa em linhas.
 *
 * O que é COMPARTILHADO de verdade — e por isso importado, não copiado — são os
 * **tipos de DTO e de entrada**: um registro de OS e um de Troca têm a mesma
 * forma, e a interface usa os mesmos componentes para os dois. Duplicar os
 * tipos faria os componentes precisarem de dois conjuntos de props idênticos.
 *
 * Os invariantes são os mesmos: transação única, custos por
 * delete-and-recreate, nenhum total persistido, sem auditoria (ADR-0401),
 * pertencimento ao agregado em toda operação (ADR-0409) e snapshot do nome do
 * responsável reescrito só quando ele muda (ADR-0408).
 */

export type { RegistroPosVendaDTO, RegistroPosVendaInput };

export const REGISTRO_OS_NAO_ENCONTRADO =
  "Registro não encontrado nesta ordem de serviço.";
export const USUARIO_NAO_ENCONTRADO = "Usuário não encontrado.";
export const SEM_PAPEL_TECNICO = `O usuário selecionado não tem o papel de ${LABEL_PAPEL.ehTecnico}.`;
export const REGISTRO_COM_CUSTOS =
  "Este registro possui custos lançados e não pode ser excluído. " +
  "Edite o registro para corrigir os custos.";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Nome do Usuário PERSISTIDO, com o papel exigido na MESMA leitura. */
async function nomeDoResponsavel(tx: Tx, usuarioId: string): Promise<string> {
  const u = await tx.usuario.findUnique({
    where: { id: usuarioId },
    select: { nome: true, ativo: true, ehTecnico: true },
  });
  if (!u) throw new Error(USUARIO_NAO_ENCONTRADO);
  if (!u.ativo || !u.ehTecnico) throw new Error(SEM_PAPEL_TECNICO);
  return u.nome;
}

const trimOrNull = (v?: string | null): string | null => {
  const t = v?.trim();
  return t ? t : null;
};

const toNumber = (v: { toString(): string }): number => Number(v.toString());

/** dataHora desc, createdAt desc, id desc — ver a explicação no gêmeo da Troca. */
export const ORDEM_TIMELINE_OS = [
  { dataHora: "desc" as const },
  { createdAt: "desc" as const },
  { id: "desc" as const },
];

export const INCLUDE_REGISTRO_OS = {
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

export function mapRegistroOS(r: LinhaRegistro): RegistroPosVendaDTO {
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

export async function listarRegistrosOS(
  ordemServicoId: string,
): Promise<RegistroPosVendaDTO[]> {
  const rows = await prisma.ordemServicoPosVendaRegistro.findMany({
    where: { ordemServicoId },
    orderBy: ORDEM_TIMELINE_OS,
    include: INCLUDE_REGISTRO_OS,
  });
  return rows.map(mapRegistroOS);
}

export async function criarRegistroOS(
  ordemServicoId: string,
  input: RegistroPosVendaInput,
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    const os = await tx.ordemServicoPosVenda.findUnique({
      where: { id: ordemServicoId },
      select: { id: true },
    });
    if (!os) throw new Error(REGISTRO_OS_NAO_ENCONTRADO);

    const responsavelNome = await nomeDoResponsavel(tx, input.responsavelId);

    const criado = await tx.ordemServicoPosVendaRegistro.create({
      data: {
        ordemServicoId,
        dataHora: input.dataHora,
        responsavelId: input.responsavelId,
        responsavelNome,
        relato: input.relato.trim(),
      },
      select: { id: true },
    });

    for (const custo of input.custos) {
      await tx.ordemServicoPosVendaRegistroCusto.create({
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
 * Edição. O registro é carregado **condicionado à OS** (`id` E
 * `ordemServicoId`), ANTES do delete-and-recreate dos custos: invertida, uma
 * tentativa cruzada apagaria os custos do registro alvo antes de ser recusada.
 */
export async function atualizarRegistroOS(
  ordemServicoId: string,
  id: string,
  input: RegistroPosVendaInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const atual = await tx.ordemServicoPosVendaRegistro.findFirst({
      where: { id, ordemServicoId },
      select: { id: true, responsavelId: true },
    });
    if (!atual) throw new Error(REGISTRO_OS_NAO_ENCONTRADO);

    const trocouResponsavel = atual.responsavelId !== input.responsavelId;
    const responsavelNome = trocouResponsavel
      ? await nomeDoResponsavel(tx, input.responsavelId)
      : undefined;

    await tx.ordemServicoPosVendaRegistro.update({
      where: { id },
      data: {
        dataHora: input.dataHora,
        responsavelId: input.responsavelId,
        responsavelNome,
        relato: input.relato.trim(),
      },
    });

    await tx.ordemServicoPosVendaRegistroCusto.deleteMany({
      where: { registroId: id },
    });
    for (const custo of input.custos) {
      await tx.ordemServicoPosVendaRegistroCusto.create({
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

/** Exclusão: pertencimento primeiro, bloqueio por custos depois (ADR-0401). */
export async function excluirRegistroOS(
  ordemServicoId: string,
  id: string,
): Promise<void> {
  const registro = await prisma.ordemServicoPosVendaRegistro.findFirst({
    where: { id, ordemServicoId },
    select: { id: true, _count: { select: { custos: true } } },
  });
  if (!registro) throw new Error(REGISTRO_OS_NAO_ENCONTRADO);
  if (registro._count.custos > 0) throw new Error(REGISTRO_COM_CUSTOS);

  await prisma.ordemServicoPosVendaRegistro.deleteMany({
    where: { id, ordemServicoId },
  });

  // Depois do commit e best-effort — o lado tolerado do invariante.
  await removerPastaDoRegistro("OS", ordemServicoId, id);
}
