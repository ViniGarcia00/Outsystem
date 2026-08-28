import type { CategoriaCustoInstalacao } from "@/features/instalacoes/custos";
import type { TipoRegistroInstalacao } from "@/features/instalacoes/labels";
import { LABEL_PAPEL } from "@/features/usuarios/opcoes";
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
 * - **Invariante do agregado:** editar ou excluir um registro exige que ele
 *   PERTENÇA à instalação informada. A consulta é sempre condicionada por
 *   `id` E `instalacaoId`; não pertencer devolve o mesmo "não encontrado" de
 *   um id inexistente.
 * - O responsável é VÍNCULO com Usuario mais SNAPSHOT do nome (ADR-0408,
 *   preservado pelo ADR-0410). O snapshot é derivado aqui dentro, do Usuario
 *   persistido, e só é reescrito quando o técnico do registro MUDA — editar o
 *   relatório não mexe nele. O papel de técnico é obrigatório e verificado na
 *   mesma leitura que produz o nome.
 */

export interface CustoDTO {
  id: string;
  categoria: CategoriaCustoInstalacao;
  descricao: string | null;
  valor: number;
}

/** Metadados de um anexo, como a cronologia os exibe. */
export interface AnexoDTO {
  id: string;
  nomeOriginal: string;
  mimeType: string;
  tamanho: number;
  createdAt: Date;
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
  /**
   * Anexos do registro (Sprint 4.3, ADR-0414). Metadados apenas — o conteúdo é
   * servido pela rota de download, nunca embutido no DTO.
   */
  anexos: AnexoDTO[];
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
export const USUARIO_NAO_ENCONTRADO = "Usuário não encontrado.";
/** Papel de técnico é OBRIGATÓRIO na cronologia (ADR-0410). */
export const SEM_PAPEL_TECNICO = `O usuário selecionado não tem o papel de ${LABEL_PAPEL.ehTecnico}.`;

/** Mensagem oficial do bloqueio de exclusão (ADR-0401). */
export const REGISTRO_COM_CUSTOS =
  "Este registro possui custos lançados e não pode ser excluído. " +
  "Edite o registro para corrigir os custos.";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Nome do Usuário PERSISTIDO, lido dentro da transação, com o papel de técnico
 * exigido na MESMA leitura.
 *
 * O nome NUNCA vem do navegador — é a mesma regra do snapshot de endereço
 * (ADR-0400), e pelo mesmo motivo: uma garantia de integridade não pode depender
 * do estado de um formulário. O papel entra aqui, e não em uma consulta
 * separada, porque as duas respostas precisam vir do mesmo estado (ADR-0410).
 *
 * Diferente de Proposta e Instalação, aqui o responsável é OBRIGATÓRIO: um
 * acontecimento da cronologia sem quem o executou não é um fato registrável.
 */
async function nomeDoTecnico(tx: Tx, usuarioId: string): Promise<string> {
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

/**
 * Custos e anexos de um registro, sempre na ordem em que foram lançados.
 *
 * O nome ficou como estava: renomear obrigaria a tocar em instalacao.service.ts
 * e no teste de integração da cronologia sem nenhum ganho — é o mesmo include,
 * com uma relação a mais.
 */
export const INCLUDE_CUSTOS = {
  custos: { orderBy: { createdAt: "asc" as const } },
  anexos: { orderBy: { createdAt: "asc" as const } },
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
  anexos: {
    id: string;
    nomeOriginal: string;
    mimeType: string;
    tamanho: number;
    createdAt: Date;
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
    anexos: r.anexos.map((a) => ({
      id: a.id,
      nomeOriginal: a.nomeOriginal,
      mimeType: a.mimeType,
      tamanho: a.tamanho,
      createdAt: a.createdAt,
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

/**
 * Edição: substitui os custos por completo, dentro da mesma transação.
 *
 * O registro é carregado **condicionado à instalação** (`id` E `instalacaoId`).
 * Sem isso, uma chamada com o `instalacaoId` de A e o `registroId` de B editaria
 * o histórico de B — a Instalação A funcionaria como chave para o agregado da
 * outra. A garantia mora aqui, não na Server Action nem na tela: a interface
 * pode mandar o par certo, mas integridade não pode depender disso.
 *
 * A checagem acontece ANTES do delete-and-recreate dos custos. Invertida, uma
 * tentativa cruzada apagaria os custos do registro alvo antes de ser recusada.
 */
export async function atualizarRegistro(
  instalacaoId: string,
  id: string,
  input: RegistroInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const atual = await tx.instalacaoRegistro.findFirst({
      where: { id, instalacaoId },
      select: { id: true, tecnicoId: true },
    });
    // Registro inexistente e registro de outra instalação devolvem a MESMA
    // mensagem, de propósito: dizer "esse registro é da instalação 1050"
    // vazaria a existência de um agregado vizinho.
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
 * Exclusão: permitida apenas quando o registro pertence à instalação informada
 * E não tem custos.
 *
 * A ordem importa. Primeiro o pertencimento, depois os custos: um registro de
 * outra instalação nem chega a ser avaliado quanto a custos, e a resposta é a
 * mesma de "não encontrado".
 *
 * A checagem de custos é aqui, não na interface: o `onDelete: Cascade` do banco
 * apagaria os custos junto, que é justamente o que a regra impede (ADR-0401).
 *
 * O `deleteMany` repete as duas condições em vez de apagar por `id` já
 * verificado — assim a janela entre a leitura e a escrita não é explorável.
 */
export async function excluirRegistro(
  instalacaoId: string,
  id: string,
): Promise<void> {
  const registro = await prisma.instalacaoRegistro.findFirst({
    where: { id, instalacaoId },
    select: { id: true, _count: { select: { custos: true } } },
  });
  if (!registro) throw new Error(REGISTRO_NAO_ENCONTRADO);
  if (registro._count.custos > 0) throw new Error(REGISTRO_COM_CUSTOS);

  await prisma.instalacaoRegistro.deleteMany({ where: { id, instalacaoId } });
}
