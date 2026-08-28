/**
 * Catálogo de versões do template de contrato (Sprint 4.4, ADR-0415).
 *
 * ── POR QUE EM CÓDIGO, E NÃO EM TABELA ──────────────────────────────────────
 * O conjunto de tags de cada versão **é um contrato de código** com o
 * `ContratoTemplateDTO`: renomear um campo tem de quebrar o typecheck, não
 * passar despercebido por um `INSERT`. São poucos arquivos, já versionados no
 * git, e uma tabela exigiria CRUD, tela e migração de dados para resolver o que
 * um mapa de duas entradas resolve.
 *
 * ── A REGRA QUE ISTO EXISTE PARA GARANTIR ───────────────────────────────────
 * O contrato é renderizado com **a versão carimbada na revisão emitida**
 * (`PropostaRevisao.templateContratoVersao`), NUNCA com "a versão vigente". Sem
 * isso, trocar o arquivo do template reescreveria o texto jurídico de qualquer
 * contrato regenerado depois — em silêncio.
 *
 * Módulo PURO: sem `fs`, sem `path`, sem IO. Quem resolve caminho é o renderer.
 */

/** Tags comuns a todas as versões — o cabeçalho comercial do contrato. */
const TAGS_BASE = [
  "clienteNome",
  "clienteDocumento",
  "clienteEndereco",
  "propostaNumero",
  "valorTotal",
  "valorTotalExtenso",
  "formaPagamento",
  "data",
  "empresaNome",
] as const;

export interface TemplateContrato {
  /** Nome do arquivo dentro de `public/templates/contrato/`. */
  arquivo: string;
  /** Data a partir da qual esta versão passou a ser emitida (ISO). */
  vigenteDe: string;
  /** Tags que o `.docx` desta versão contém, sem chaves. */
  tags: readonly string[];
  /**
   * Se `true`, a geração exige os campos contratuais da Rev. 4
   * (`prazoExecucaoDiasUteis` e `valorParcelaFinal`). Sem eles o documento
   * sairia com "de  dias úteis" e "R$ ." — ver a guarda em `contrato.mapper`.
   */
  exigeCamposContratuais: boolean;
}

export const TEMPLATES_CONTRATO = {
  /** Template original da Sprint 3.1 (ADR-0330). Preservado para sempre. */
  rev3: {
    arquivo: "contrato-outmat.rev3.docx",
    vigenteDe: "2026-07-17",
    tags: TAGS_BASE,
    exigeCamposContratuais: false,
  },
  /**
   * Rev. 4 (ADR-0416). Novas cláusulas 5.3.1, 5.5.1, 5.6, 5.7, 5.7.1, 9.3 e
   * 9.4; prazo de execução e parcela final passam a ser variáveis.
   */
  rev4: {
    arquivo: "contrato-outmat.rev4.docx",
    vigenteDe: "2026-08-28",
    tags: [...TAGS_BASE, "prazoExecucao", "valorParcelaFinal", "observacoes"],
    exigeCamposContratuais: true,
  },
} as const satisfies Record<string, TemplateContrato>;

export type VersaoTemplateContrato = keyof typeof TEMPLATES_CONTRATO;

/**
 * Versão carimbada em NOVAS emissões (`emitirProposta`).
 *
 * Trocar esta constante NÃO altera nenhum contrato já emitido: cada revisão
 * carrega a versão com que foi congelada.
 */
export const TEMPLATE_CONTRATO_VIGENTE: VersaoTemplateContrato = "rev3";

/**
 * Versão assumida quando a revisão não tem carimbo.
 *
 * Revisões emitidas antes da Sprint 4.4 têm a coluna nula — e tudo o que existia
 * então era a rev3. O fallback dá essa inferência sem que a migration precise
 * AFIRMAR retroativamente uma versão que ninguém registrou.
 */
export const TEMPLATE_CONTRATO_PADRAO: VersaoTemplateContrato = "rev3";

/** `true` quando a string é uma versão conhecida do catálogo. */
export function ehVersaoConhecida(v: unknown): v is VersaoTemplateContrato {
  return typeof v === "string" && v in TEMPLATES_CONTRATO;
}

/**
 * Resolve a versão a ser usada na renderização.
 *
 * Nulo, vazio ou desconhecido caem no padrão histórico. Uma versão que sumiu do
 * catálogo é sinal de template apagado — o que o ADR-0415 proíbe —, mas ainda
 * assim é melhor entregar o contrato mais antigo conhecido do que quebrar.
 */
export function resolverVersaoTemplate(
  versao: string | null | undefined,
): VersaoTemplateContrato {
  return ehVersaoConhecida(versao) ? versao : TEMPLATE_CONTRATO_PADRAO;
}

/** Metadados da versão já resolvida. */
export function templateDe(versao: VersaoTemplateContrato): TemplateContrato {
  return TEMPLATES_CONTRATO[versao];
}
