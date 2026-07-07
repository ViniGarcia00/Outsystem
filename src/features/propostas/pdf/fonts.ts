import path from "node:path";

import { Font } from "@react-pdf/renderer";

/**
 * Registro da fonte do documento (Inter — TTF em `public/fonts`). Idempotente:
 * registrar mais de uma vez é inofensivo, mas evitamos o retrabalho. Ler do
 * disco (via `process.cwd()`) mantém o PDF independente de rede em produção.
 */

export const FONT_FAMILY = "Inter";

let registrado = false;

export function registrarFontes(): void {
  if (registrado) return;
  const dir = path.join(process.cwd(), "public", "fonts");
  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: path.join(dir, "Inter_400Regular.ttf"), fontWeight: 400 },
      { src: path.join(dir, "Inter_500Medium.ttf"), fontWeight: 500 },
      { src: path.join(dir, "Inter_600SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(dir, "Inter_700Bold.ttf"), fontWeight: 700 },
    ],
  });
  // Português não deve ser hifenizado automaticamente pela biblioteca.
  Font.registerHyphenationCallback((word) => [word]);
  registrado = true;
}
