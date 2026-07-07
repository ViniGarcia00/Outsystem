import { existsSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/infrastructure/database";
import { resolveWithin, storagePaths } from "@/infrastructure/storage";

/**
 * Logotipo da empresa — enviado por UPLOAD (sem links externos). O arquivo é
 * gravado no armazenamento de uploads (fora do repositório) e `Config.logo`
 * guarda apenas o nome do arquivo. Usado pelo PDF e por outros documentos.
 */

const SINGLETON_ID = "singleton";
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/** Tipos aceitos (PNG/JPG — compatíveis com o @react-pdf/renderer). */
const EXT_POR_TIPO: Record<string, "png" | "jpg"> = {
  "image/png": "png",
  "image/jpeg": "jpg",
};

/** `accept` do input de arquivo. */
export const LOGO_ACCEPT = "image/png,image/jpeg";

/** Grava o logo enviado e persiste o nome do arquivo em `Config.logo`. */
export async function saveLogoFile(file: File): Promise<string> {
  const ext = EXT_POR_TIPO[file.type];
  if (!ext) {
    throw new Error("Envie uma imagem PNG ou JPG.");
  }
  if (file.size === 0) {
    throw new Error("Arquivo de imagem vazio.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("A imagem deve ter no máximo 2 MB.");
  }

  await mkdir(storagePaths.upload, { recursive: true });
  const filename = `logo.${ext}`;
  const destino = resolveWithin(storagePaths.upload, filename);
  await writeFile(destino, Buffer.from(await file.arrayBuffer()));

  // Remove um logo anterior de extensão diferente (evita arquivo órfão).
  const outro = ext === "png" ? "logo.jpg" : "logo.png";
  const outroPath = path.join(storagePaths.upload, outro);
  if (existsSync(outroPath)) {
    try {
      await unlink(outroPath);
    } catch {
      // Órfão inofensivo; ignora falha na limpeza.
    }
  }

  await prisma.configuracaoSistema.upsert({
    where: { id: SINGLETON_ID },
    update: { logo: filename },
    create: { id: SINGLETON_ID, logo: filename },
  });
  return filename;
}

/** Caminho absoluto do logo atual, se o arquivo existir; senão null. */
export async function getLogoAbsolutePath(): Promise<string | null> {
  const config = await prisma.configuracaoSistema.findUnique({
    where: { id: SINGLETON_ID },
    select: { logo: true },
  });
  const logo = config?.logo?.trim();
  if (!logo) return null;
  let alvo: string;
  try {
    alvo = resolveWithin(storagePaths.upload, logo);
  } catch {
    return null;
  }
  return existsSync(alvo) ? alvo : null;
}

/** Lê o logo atual para servir/embutir; null quando não há logo. */
export async function readLogoFile(): Promise<{
  data: Buffer;
  contentType: string;
} | null> {
  const alvo = await getLogoAbsolutePath();
  if (!alvo) return null;
  const data = await readFile(alvo);
  const contentType = alvo.toLowerCase().endsWith(".png")
    ? "image/png"
    : "image/jpeg";
  return { data, contentType };
}
