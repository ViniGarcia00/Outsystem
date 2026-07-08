import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Carregamento dos templates gráficos do PDF Apresentação (1920×1080, 16:9).
 * Cada PNG é usado como PLANO DE FUNDO de página inteira. Lidos do disco e
 * convertidos em data URI (base64) — data URI é o que o @react-pdf embute de
 * forma confiável (evita ambiguidade de caminho no Windows).
 *
 * Sem cache: assim, ao substituir as imagens em `public/templates/presentation/`,
 * a próxima geração já reflete a troca — basta copiar o arquivo, sem mudar código.
 *
 * Nomenclatura OFICIAL (Sprint 2.9.3): 13 templates, incluindo os slides de
 * Serviços Complementares (09 Som, 10 Wi-Fi) e o 11 Investimento Total. Os
 * slides 09/10/11 são RENDERIZADOS condicionalmente (ver presentation-document),
 * mas o template é sempre carregado.
 */

const DIR = path.join(process.cwd(), "public", "templates", "presentation");

export const TEMPLATE_FILES = [
  "page-01-cover",
  "page-02-about",
  "page-03-benefits",
  "page-04-projects",
  "page-05-process",
  "page-06-automation-project",
  "page-07-automation-services",
  "page-08-automation-investment",
  "page-09-sound-project",
  "page-10-wifi-premium",
  "page-11-total-investment",
  "page-12-payment",
  "page-13-thank-you",
] as const;

export type TemplateKey = (typeof TEMPLATE_FILES)[number];
export type Templates = Record<TemplateKey, string>;

export function carregarTemplates(): Templates {
  const templates = {} as Templates;
  for (const nome of TEMPLATE_FILES) {
    const buffer = readFileSync(path.join(DIR, `${nome}.png`));
    templates[nome] = `data:image/png;base64,${buffer.toString("base64")}`;
  }
  return templates;
}
