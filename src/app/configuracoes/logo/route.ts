import { readLogoFile } from "@/services/logo.service";

/**
 * Serve o logotipo da empresa (upload) para preview no formulário e uso em
 * documentos web. O PDF lê o arquivo diretamente do disco. Sem cache (o logo
 * pode ser substituído a qualquer momento).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const logo = await readLogoFile();
  if (!logo) {
    return new Response("Logotipo não configurado.", { status: 404 });
  }
  return new Response(new Uint8Array(logo.data), {
    status: 200,
    headers: {
      "Content-Type": logo.contentType,
      "Cache-Control": "no-store",
    },
  });
}
