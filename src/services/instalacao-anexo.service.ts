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
  extensaoDe,
  nomeFisico,
  pastaRelativaDoRegistro,
  sanitizarNomeOriginal,
  validarArquivo,
} from "@/features/instalacoes/anexos";
import { prisma } from "@/infrastructure/database";
import { logger } from "@/infrastructure/logging";
import { resolveWithin, storagePaths } from "@/infrastructure/storage";
import { REGISTRO_NAO_ENCONTRADO } from "@/lib/messages";

import type { AnexoDTO } from "./instalacao-registro.service";

/**
 * Anexos do registro da cronologia (Sprint 4.3, ADR-0414).
 *
 * ── O INVARIANTE QUE GOVERNA TUDO ───────────────────────────────────────────
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
 * `{ id, registro: { id, instalacaoId } }`, e não pertencer devolve exatamente
 * o mesmo "não encontrado" de um id inexistente — não vazar a diferença é parte
 * da garantia. Mesma classe de invariante do ADR-0409, provada por pares
 * cruzados discriminantes em `instalacao-anexo.integration.test.ts`.
 *
 * ── FILESYSTEM ──────────────────────────────────────────────────────────────
 * Todo acesso passa por `resolveWithin(storagePaths.upload, …)`. O nome físico
 * é gerado aqui; o nome enviado pelo navegador nunca compõe caminho.
 *
 * A gravação usa `file.stream()` em vez de `arrayBuffer()` + `Buffer.from()`:
 * uma cópia integral a menos, medido no spike da T15.
 */

/**
 * `AnexoDTO` mora em `instalacao-registro.service.ts` e é reexportado aqui.
 *
 * A direção da dependência é essa porque este módulo já importa
 * `REGISTRO_NAO_ENCONTRADO` de lá — inverter criaria import circular. O DTO é
 * do agregado da cronologia; os anexos são conteúdo dele.
 */
export type { AnexoDTO };

const SELECT_DTO = {
  id: true,
  nomeOriginal: true,
  mimeType: true,
  tamanho: true,
  createdAt: true,
} as const;

/**
 * Condição de pertencimento ao agregado. Existe como função para que seja
 * impossível escrever uma consulta de anexo "esquecendo" um dos ids.
 */
const doAgregado = (instalacaoId: string, registroId: string) => ({
  registro: { id: registroId, instalacaoId },
});

/** Caminho absoluto do anexo, sempre por `resolveWithin`. */
function absoluto(caminhoRelativo: string): string {
  return resolveWithin(storagePaths.upload, caminhoRelativo);
}

/**
 * Anexa um arquivo a um registro.
 *
 * O registro precisa pertencer à instalação — a checagem é a mesma consulta que
 * conta os anexos existentes, para que as duas respostas venham do mesmo estado.
 */
export async function criarAnexo(
  instalacaoId: string,
  registroId: string,
  file: File,
): Promise<AnexoDTO> {
  const erro = validarArquivo({ mime: file.type, tamanho: file.size });
  if (erro) throw new Error(erro);

  const registro = await prisma.instalacaoRegistro.findFirst({
    where: { id: registroId, instalacaoId },
    select: { id: true, _count: { select: { anexos: true } } },
  });
  if (!registro) throw new Error(REGISTRO_NAO_ENCONTRADO);
  if (registro._count.anexos >= MAX_POR_REGISTRO) {
    throw new Error(ANEXO_MAXIMO_ATINGIDO);
  }

  // Chave física ALEATÓRIA, gerada no servidor. Não é o id da linha de
  // propósito: o nome do arquivo em disco não precisa expor a chave do banco.
  const chave = randomBytes(16).toString("hex");
  const nomeArmazenado = nomeFisico(chave, file.type);
  const caminhoRelativo = caminhoRelativoDe(
    instalacaoId,
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
    return await prisma.instalacaoRegistroAnexo.create({
      data: {
        registroId,
        nomeOriginal: sanitizarNomeOriginal(file.name),
        nomeArmazenado,
        caminhoRelativo,
        mimeType: file.type,
        tamanho: file.size,
      },
      select: SELECT_DTO,
    });
  } catch (e) {
    // O arquivo já está no disco e a linha não existe: apaga o arquivo para não
    // deixar órfão. Best-effort — se o unlink também falhar, sobra um arquivo
    // invisível, que é o lado TOLERADO do invariante. O erro original sobe.
    await unlink(destino).catch((falha) => {
      logger.warn("Anexo: falha ao limpar arquivo após erro de banco", {
        caminhoRelativo,
        falha,
      });
    });
    throw e;
  }
}

/** Anexos de um registro, do mais antigo para o mais novo. */
export async function listarAnexos(
  instalacaoId: string,
  registroId: string,
): Promise<AnexoDTO[]> {
  return prisma.instalacaoRegistroAnexo.findMany({
    where: doAgregado(instalacaoId, registroId),
    orderBy: { createdAt: "asc" },
    select: SELECT_DTO,
  });
}

/**
 * Conteúdo do anexo para download. `null` quando não existe **ou** quando os
 * ids não formam o agregado — a resposta é a mesma nos dois casos.
 */
export async function lerAnexo(
  instalacaoId: string,
  registroId: string,
  anexoId: string,
): Promise<{ data: Buffer; mimeType: string; nomeOriginal: string } | null> {
  const anexo = await prisma.instalacaoRegistroAnexo.findFirst({
    where: { id: anexoId, ...doAgregado(instalacaoId, registroId) },
    select: { caminhoRelativo: true, mimeType: true, nomeOriginal: true },
  });
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
    logger.error("Anexo: linha aponta para arquivo inexistente", {
      anexoId,
      caminhoRelativo: anexo.caminhoRelativo,
      falha,
    });
    return null;
  }
}

/** Exclui um anexo: primeiro a linha, depois o arquivo. */
export async function excluirAnexo(
  instalacaoId: string,
  registroId: string,
  anexoId: string,
): Promise<void> {
  const anexo = await prisma.instalacaoRegistroAnexo.findFirst({
    where: { id: anexoId, ...doAgregado(instalacaoId, registroId) },
    select: { id: true, caminhoRelativo: true },
  });
  if (!anexo) throw new Error(ANEXO_NAO_ENCONTRADO);

  await prisma.instalacaoRegistroAnexo.delete({ where: { id: anexo.id } });

  // Depois do commit. Falhar aqui deixa um órfão inofensivo; falhar na ordem
  // inversa deixaria a linha apontando para o nada.
  await unlink(absoluto(anexo.caminhoRelativo)).catch((falha) => {
    logger.warn("Anexo: linha excluída, arquivo permaneceu", {
      caminhoRelativo: anexo.caminhoRelativo,
      falha,
    });
  });
}

/**
 * Remove a pasta de anexos de um registro. Usado APÓS o commit da exclusão do
 * registro (T21) — as linhas já saíram por cascade.
 */
export async function removerPastaDoRegistro(
  instalacaoId: string,
  registroId: string,
): Promise<void> {
  const relativa = pastaRelativaDoRegistro(instalacaoId, registroId);
  // `resolveWithin` é o que garante que o `rm -r` não pode escapar da raiz de
  // uploads, mesmo que algum id chegasse adulterado.
  const alvo = absoluto(relativa);
  await rm(alvo, { recursive: true, force: true }).catch((falha) => {
    logger.warn("Anexo: pasta do registro não pôde ser removida", {
      relativa,
      falha,
    });
  });
}

export { extensaoDe };
