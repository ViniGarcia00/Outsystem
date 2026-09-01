import { randomBytes } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import {
  ANEXO_MAXIMO_ATINGIDO,
  ANEXO_NAO_ENCONTRADO,
  MAX_POR_REGISTRO,
  caminhoRelativoDe,
  nomeFisico,
  pastaRelativaDoAgregado,
  pastaRelativaDoRegistro,
  sanitizarNomeOriginal,
  validarArquivo,
  type AgregadoPosVenda,
} from "@/features/pos-venda/anexos";
import { prisma } from "@/infrastructure/database";
import { logger } from "@/infrastructure/logging";
import { resolveWithin, storagePaths } from "@/infrastructure/storage";

import type { AnexoPosVendaDTO } from "./pos-venda-troca-registro.service";

/**
 * Anexos do Pós-venda (Sprint 4.6) — Troca e OS.
 *
 * ── O INVARIANTE QUE GOVERNA TUDO (ADR-0414) ────────────────────────────────
 * O **banco é a autoridade**. Arquivo órfão em disco é tolerado e logável;
 * linha apontando para arquivo inexistente é o estado a evitar.
 *
 * É essa assimetria — e não uma preferência de estilo — que fixa a ordem das
 * duas operações:
 *   criar   → grava o ARQUIVO, depois a LINHA (falhou a linha: apaga o arquivo)
 *   excluir → apaga a LINHA, depois o ARQUIVO (falhou o arquivo: só loga)
 *
 * ── RESOLUÇÃO PELO AGREGADO COMPLETO ────────────────────────────────────────
 * Nenhuma consulta resolve um anexo só por `anexoId`. A condição é sempre
 * `{ id, registro: { id, <agregado>Id } }`, e não pertencer devolve exatamente
 * o mesmo "não encontrado" de um id inexistente.
 *
 * ── POR QUE UM SERVICE SÓ, COM DUAS PORTAS ──────────────────────────────────
 * Troca e OS têm tabelas próprias e colunas de FK com nomes diferentes. O que
 * NÃO pode ser escrito duas vezes é a lógica arriscada: validação, geração do
 * nome físico, `resolveWithin`, a ordem das escritas e o tratamento de falha.
 * Duplicar isso é como se perde uma garantia de segurança em uma das cópias.
 *
 * A saída é uma `PortaAnexo` por agregado — cinco consultas Prisma diretas,
 * cada uma com a condição de pertencimento escrita por extenso, legível e
 * revisável. Nada de delegate dinâmico, nada de `any`: o discriminador é um
 * `Record` de duas entradas, e o typecheck cobre as duas.
 *
 * ── FILESYSTEM ──────────────────────────────────────────────────────────────
 * Todo acesso passa por `resolveWithin(storagePaths.upload, …)`. O nome físico
 * é gerado aqui; o nome enviado pelo navegador nunca compõe caminho.
 *
 * A gravação usa `file.stream()` em vez de `arrayBuffer()`: uma cópia integral
 * a menos, como no service de Instalações.
 */

export type { AgregadoPosVenda, AnexoPosVendaDTO };

export const REGISTRO_POS_VENDA_NAO_ENCONTRADO =
  "Registro não encontrado neste processo de pós-venda.";

const SELECT_DTO = {
  id: true,
  nomeOriginal: true,
  mimeType: true,
  tamanho: true,
  createdAt: true,
} as const;

/** Dados de uma linha nova, já validados e com caminho resolvido. */
interface LinhaNova {
  registroId: string;
  nomeOriginal: string;
  nomeArmazenado: string;
  caminhoRelativo: string;
  mimeType: string;
  tamanho: number;
}

/** Um anexo resolvido pelo agregado, com o que o disco precisa. */
interface AnexoFisico {
  id: string;
  caminhoRelativo: string;
  mimeType: string;
  nomeOriginal: string;
}

/**
 * O acesso ao banco de UM agregado. Cinco operações, todas condicionadas ao
 * agregado completo — é justamente por serem explícitas que se pode conferir,
 * lendo, que nenhuma "esquece" um id.
 */
interface PortaAnexo {
  /** Anexos já existentes no registro, ou `null` se o registro não é do agregado. */
  contarNoRegistro(
    agregadoId: string,
    registroId: string,
  ): Promise<number | null>;
  criar(linha: LinhaNova): Promise<AnexoPosVendaDTO>;
  listar(agregadoId: string, registroId: string): Promise<AnexoPosVendaDTO[]>;
  buscar(
    agregadoId: string,
    registroId: string,
    anexoId: string,
  ): Promise<AnexoFisico | null>;
  excluirLinha(id: string): Promise<void>;
}

const PORTAS: Record<AgregadoPosVenda, PortaAnexo> = {
  TROCA: {
    async contarNoRegistro(trocaAntecipadaId, registroId) {
      const r = await prisma.trocaAntecipadaRegistro.findFirst({
        where: { id: registroId, trocaAntecipadaId },
        select: { _count: { select: { anexos: true } } },
      });
      return r ? r._count.anexos : null;
    },
    criar: (data) =>
      prisma.trocaAntecipadaRegistroAnexo.create({ data, select: SELECT_DTO }),
    listar: (trocaAntecipadaId, registroId) =>
      prisma.trocaAntecipadaRegistroAnexo.findMany({
        where: { registro: { id: registroId, trocaAntecipadaId } },
        orderBy: { createdAt: "asc" },
        select: SELECT_DTO,
      }),
    buscar: (trocaAntecipadaId, registroId, anexoId) =>
      prisma.trocaAntecipadaRegistroAnexo.findFirst({
        where: {
          id: anexoId,
          registro: { id: registroId, trocaAntecipadaId },
        },
        select: {
          id: true,
          caminhoRelativo: true,
          mimeType: true,
          nomeOriginal: true,
        },
      }),
    async excluirLinha(id) {
      await prisma.trocaAntecipadaRegistroAnexo.delete({ where: { id } });
    },
  },

  OS: {
    async contarNoRegistro(ordemServicoId, registroId) {
      const r = await prisma.ordemServicoPosVendaRegistro.findFirst({
        where: { id: registroId, ordemServicoId },
        select: { _count: { select: { anexos: true } } },
      });
      return r ? r._count.anexos : null;
    },
    criar: (data) =>
      prisma.ordemServicoPosVendaRegistroAnexo.create({
        data,
        select: SELECT_DTO,
      }),
    listar: (ordemServicoId, registroId) =>
      prisma.ordemServicoPosVendaRegistroAnexo.findMany({
        where: { registro: { id: registroId, ordemServicoId } },
        orderBy: { createdAt: "asc" },
        select: SELECT_DTO,
      }),
    buscar: (ordemServicoId, registroId, anexoId) =>
      prisma.ordemServicoPosVendaRegistroAnexo.findFirst({
        where: { id: anexoId, registro: { id: registroId, ordemServicoId } },
        select: {
          id: true,
          caminhoRelativo: true,
          mimeType: true,
          nomeOriginal: true,
        },
      }),
    async excluirLinha(id) {
      await prisma.ordemServicoPosVendaRegistroAnexo.delete({ where: { id } });
    },
  },
};

/** Caminho absoluto do anexo, sempre por `resolveWithin`. */
function absoluto(caminhoRelativo: string): string {
  return resolveWithin(storagePaths.upload, caminhoRelativo);
}

/**
 * Anexa um arquivo a um registro.
 *
 * O registro precisa pertencer ao agregado — a checagem é a mesma consulta que
 * conta os anexos existentes, para que as duas respostas venham do mesmo
 * estado.
 */
export async function criarAnexoPosVenda(
  agregado: AgregadoPosVenda,
  agregadoId: string,
  registroId: string,
  file: File,
): Promise<AnexoPosVendaDTO> {
  const erro = validarArquivo({ mime: file.type, tamanho: file.size });
  if (erro) throw new Error(erro);

  const porta = PORTAS[agregado];
  const existentes = await porta.contarNoRegistro(agregadoId, registroId);
  if (existentes === null) throw new Error(REGISTRO_POS_VENDA_NAO_ENCONTRADO);
  if (existentes >= MAX_POR_REGISTRO) throw new Error(ANEXO_MAXIMO_ATINGIDO);

  // Chave física ALEATÓRIA, gerada no servidor. Não é o id da linha de
  // propósito: o nome do arquivo em disco não precisa expor a chave do banco.
  const chave = randomBytes(16).toString("hex");
  const nomeArmazenado = nomeFisico(chave, file.type);
  const caminhoRelativo = caminhoRelativoDe(
    agregado,
    agregadoId,
    registroId,
    nomeArmazenado,
  );
  const destino = absoluto(caminhoRelativo);

  await mkdir(path.dirname(destino), { recursive: true });
  await pipeline(
    Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0]),
    createWriteStream(destino),
  );

  try {
    return await porta.criar({
      registroId,
      nomeOriginal: sanitizarNomeOriginal(file.name),
      nomeArmazenado,
      caminhoRelativo,
      mimeType: file.type,
      tamanho: file.size,
    });
  } catch (e) {
    // O arquivo já está no disco e a linha não existe: apaga o arquivo para não
    // deixar órfão. Best-effort — se o unlink também falhar, sobra um arquivo
    // invisível, que é o lado TOLERADO do invariante. O erro original sobe.
    await unlink(destino).catch((falha) => {
      logger.warn("Anexo pós-venda: falha ao limpar arquivo após erro de banco", {
        caminhoRelativo,
        falha,
      });
    });
    throw e;
  }
}

/** Anexos de um registro, do mais antigo para o mais novo. */
export function listarAnexosPosVenda(
  agregado: AgregadoPosVenda,
  agregadoId: string,
  registroId: string,
): Promise<AnexoPosVendaDTO[]> {
  return PORTAS[agregado].listar(agregadoId, registroId);
}

/**
 * Conteúdo do anexo para download. `null` quando não existe **ou** quando os
 * ids não formam o agregado — a resposta é a mesma nos dois casos.
 */
export async function lerAnexoPosVenda(
  agregado: AgregadoPosVenda,
  agregadoId: string,
  registroId: string,
  anexoId: string,
): Promise<{ data: Buffer; mimeType: string; nomeOriginal: string } | null> {
  const anexo = await PORTAS[agregado].buscar(agregadoId, registroId, anexoId);
  if (!anexo) return null;

  try {
    const data = await readFile(absoluto(anexo.caminhoRelativo));
    return {
      data,
      mimeType: anexo.mimeType,
      nomeOriginal: anexo.nomeOriginal,
    };
  } catch (falha) {
    // Linha sem arquivo: é o estado que o invariante manda evitar. Não dá para
    // servir nada, mas dá para registrar alto — é sintoma de algo que quebrou
    // fora do fluxo normal (cópia manual, restore parcial, disco cheio).
    logger.error("Anexo pós-venda: linha aponta para arquivo inexistente", {
      agregado,
      anexoId,
      caminhoRelativo: anexo.caminhoRelativo,
      falha,
    });
    return null;
  }
}

/** Exclui um anexo: primeiro a linha, depois o arquivo. */
export async function excluirAnexoPosVenda(
  agregado: AgregadoPosVenda,
  agregadoId: string,
  registroId: string,
  anexoId: string,
): Promise<void> {
  const porta = PORTAS[agregado];
  const anexo = await porta.buscar(agregadoId, registroId, anexoId);
  if (!anexo) throw new Error(ANEXO_NAO_ENCONTRADO);

  await porta.excluirLinha(anexo.id);

  // Depois do commit. Falhar aqui deixa um órfão inofensivo; falhar na ordem
  // inversa deixaria a linha apontando para o nada.
  await unlink(absoluto(anexo.caminhoRelativo)).catch((falha) => {
    logger.warn("Anexo pós-venda: linha excluída, arquivo permaneceu", {
      caminhoRelativo: anexo.caminhoRelativo,
      falha,
    });
  });
}

/**
 * Remove a pasta de anexos de um registro. Usado APÓS o commit da exclusão do
 * registro — as linhas já saíram por cascade.
 */
export async function removerPastaDoRegistro(
  agregado: AgregadoPosVenda,
  agregadoId: string,
  registroId: string,
): Promise<void> {
  const relativa = pastaRelativaDoRegistro(agregado, agregadoId, registroId);
  // `resolveWithin` é o que garante que o `rm -r` não pode escapar da raiz de
  // uploads, mesmo que algum id chegasse adulterado.
  await rm(absoluto(relativa), { recursive: true, force: true }).catch(
    (falha) => {
      logger.warn("Anexo pós-venda: pasta do registro não pôde ser removida", {
        relativa,
        falha,
      });
    },
  );
}

export { pastaRelativaDoAgregado };
