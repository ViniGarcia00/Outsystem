import path from "node:path";

import { env } from "@/infrastructure/configuration/env";

/**
 * Resolução centralizada de caminhos de armazenamento.
 *
 * Regras de arquitetura:
 * - TODOS os caminhos são configuráveis via `.env` — nunca fixos no código.
 * - Compatível com Windows Server 2019: usa sempre `path.resolve`/`path.join`,
 *   nunca separadores "/" ou "\\" hardcoded.
 * - Quando um caminho específico (PDF/UPLOAD/BACKUP/LOG) não é informado,
 *   ele é derivado da raiz `STORAGE_PATH`.
 * - Este módulo NÃO cria pastas. A criação física dos diretórios ocorrerá
 *   em Sprint posterior (nenhuma operação de I/O acontece aqui).
 */

const storageRoot = path.resolve(env.STORAGE_PATH);

function resolveConfigurable(
  configured: string | undefined,
  ...fallbackSegments: string[]
): string {
  if (configured) {
    return path.resolve(configured);
  }
  return path.join(storageRoot, ...fallbackSegments);
}

export const storagePaths = {
  /** Raiz do armazenamento (STORAGE_PATH). */
  root: storageRoot,
  /** PDFs gerados (PDF_PATH ou <root>/pdf). */
  pdf: resolveConfigurable(env.PDF_PATH, "pdf"),
  /** Uploads recebidos (UPLOAD_PATH ou <root>/uploads). */
  upload: resolveConfigurable(env.UPLOAD_PATH, "uploads"),
  /** Backups (BACKUP_PATH ou <root>/backups). */
  backup: resolveConfigurable(env.BACKUP_PATH, "backups"),
  /** Logs em arquivo (LOG_PATH ou <root>/logs). */
  log: resolveConfigurable(env.LOG_PATH, "logs"),
} as const;

export type StoragePaths = typeof storagePaths;

/**
 * Resolve um caminho seguro DENTRO de uma raiz configurada, impedindo
 * "path traversal" (ex.: nomes com "..") ao montar caminhos a partir de
 * entrada externa. Útil nas próximas Sprints ao salvar/ler arquivos.
 */
export function resolveWithin(root: string, ...segments: string[]): string {
  const target = path.resolve(root, ...segments);
  const normalizedRoot = path.resolve(root);
  const isInside =
    target === normalizedRoot ||
    target.startsWith(normalizedRoot + path.sep);

  if (!isInside) {
    throw new Error("Caminho fora do diretório permitido.");
  }
  return target;
}
