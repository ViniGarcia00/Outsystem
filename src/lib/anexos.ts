/**
 * Primitivos de ANEXO — fonte única do sistema (Sprint 4.6, ADR-0421).
 *
 * Allowlist de MIME, limites, nome físico, sanitização e montagem segura de
 * caminho relativo. Sem IO, sem Prisma, sem React.
 *
 * ── POR QUE ESTE ARQUIVO EXISTE ─────────────────────────────────────────────
 * Estas regras nasceram em `features/instalacoes/anexos.ts` (ADR-0414). Quando
 * o Pós-venda passou a anexar arquivos, havia duas saídas: escrever a mesma
 * allowlist de novo, ou promovê-la a fonte única. A primeira é exatamente o
 * defeito que o ADR-0402 corrigiu na busca — duas cópias da mesma regra que
 * divergem em silêncio, e ninguém percebe até um arquivo ser aceito num módulo
 * e recusado no outro.
 *
 * A promoção foi feita SEM tocar em call site nenhum:
 * `features/instalacoes/anexos.ts` re-exporta tudo o que está aqui e mantém
 * seus próprios construtores de caminho. Nada do módulo de Instalações mudou de
 * comportamento, e o teste que já existia continua valendo palavra por palavra.
 *
 * ── AS DUAS GARANTIAS ───────────────────────────────────────────────────────
 * 1. **A extensão vem da allowlist de MIME, nunca do nome enviado pelo
 *    navegador.** É o que impede `foto.jpg.exe` de virar executável em disco.
 * 2. **O caminho é montado só com segmentos validados**, todos gerados no
 *    servidor. `resolveWithin` continua sendo a guarda final nos services —
 *    aqui a intenção é falhar antes, e alto.
 */

/**
 * MIME aceito → extensão física. Ampliar é uma linha; nada mais depende disso.
 *
 * Word e Excel entraram na Sprint 4.5, ao lado das imagens e do PDF — a
 * operação produz orçamento, planilha de medição e laudo, e todos chegavam por
 * fora do sistema.
 *
 * **Limitação conhecida e aceita.** A validação é por MIME declarado, não por
 * conteúdo. `application/vnd.ms-excel` é o que alguns ambientes Windows
 * reportam para arquivos que não são XLS estrito — CSV inclusive. O arquivo
 * seria guardado com extensão `.xls` e o conteúdo intacto: nada executa, nada
 * escapa da raiz de uploads. Inspeção de magic bytes foi avaliada e ficou FORA
 * de propósito (ADR-0417).
 */
export const MIME_ACEITOS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
} as const;

export type MimeAceito = keyof typeof MIME_ACEITOS;

/**
 * Extensões do `accept`, na ordem em que o usuário as reconhece.
 *
 * Existe SEPARADA do mapa de MIME por um motivo só: `.jpeg` e `.jpg` são o
 * mesmo `image/jpeg`, e o mapa guarda uma extensão por MIME. O teste
 * "toda extensão da allowlist de MIME aparece no accept" é o que impede as
 * duas listas de divergirem.
 *
 * **Não é validação.** O que o servidor aceita continua sendo decidido só por
 * `MIME_ACEITOS`; isto filtra o diálogo de arquivos.
 */
export const EXTENSOES_ACEITAS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
] as const;

/** 10 MB por arquivo — cobre foto de celular com folga. */
export const MAX_BYTES = 10 * 1024 * 1024;

/** 10 anexos por registro. */
export const MAX_POR_REGISTRO = 10;

/**
 * `accept` do `<input type="file">`, derivado da allowlist — nunca escrito à
 * mão.
 *
 * Soma MIMEs e extensões porque só MIME não basta: o diálogo de arquivos do
 * Windows filtra os formatos Office pela extensão de forma bem mais confiável,
 * e `.doc`/`.xls` são justamente onde isso aparece.
 */
export const ACCEPT_ANEXO = [
  ...Object.keys(MIME_ACEITOS),
  ...EXTENSOES_ACEITAS,
].join(",");

export const ANEXO_TIPO_RECUSADO =
  "Formato não aceito. Envie JPG, PNG, WebP, PDF, Word ou Excel.";
export const ANEXO_VAZIO = "Arquivo vazio.";
export const ANEXO_LIMITE_EXCEDIDO = "O arquivo deve ter no máximo 10 MB.";
export const ANEXO_MAXIMO_ATINGIDO = `Este registro já tem ${MAX_POR_REGISTRO} anexos.`;
export const ANEXO_NAO_ENCONTRADO = "Anexo não encontrado.";

/** Extensão para um MIME da allowlist; `null` para qualquer outro. */
export function extensaoDe(mime: string): string | null {
  return (MIME_ACEITOS as Record<string, string>)[mime] ?? null;
}

/**
 * Nome físico do arquivo: `<id>.<ext>`, com o `id` gerado no servidor e a
 * extensão vinda da allowlist. O nome enviado pelo navegador não participa.
 */
export function nomeFisico(id: string, mime: string): string {
  const ext = extensaoDe(mime);
  if (!ext) throw new Error(ANEXO_TIPO_RECUSADO);
  return `${id}.${ext}`;
}

/**
 * Segmento de caminho seguro: alfanumérico com `.`, `_` e `-`, começando por
 * alfanumérico. Barra, contrabarra, `..` e vazio são recusados.
 */
const SEGMENTO_VALIDO = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Valida UM segmento de caminho, ou lança. Exportado porque cada módulo monta
 * seu próprio caminho (Instalações e Pós-venda particionam de formas
 * diferentes) — o que não pode variar é a regra do que é um segmento válido.
 */
export function segmentoSeguro(valor: string, campo: string): string {
  if (!SEGMENTO_VALIDO.test(valor) || valor.includes("..")) {
    throw new Error(`Segmento de caminho inválido (${campo}).`);
  }
  return valor;
}

/**
 * Caminho RELATIVO com separadores POSIX, montado a partir de pares
 * `[literal, valor]` e literais soltos.
 *
 * Os literais (`"instalacoes"`, `"registros"`, `"pos-venda"`) são do código e
 * passam direto; os valores vindos de fora passam por `segmentoSeguro`, com o
 * nome do campo para a mensagem de erro.
 *
 * @example caminhoRelativoSeguro(["instalacoes"], ["instalacaoId", id])
 */
export function caminhoRelativoSeguro(
  ...partes: (readonly [string] | readonly [string, string])[]
): string {
  return partes
    .map((p) => (p.length === 1 ? p[0] : segmentoSeguro(p[1], p[0])))
    .join("/");
}

/**
 * Valida tipo e tamanho. Devolve a mensagem de erro, ou `null` quando aceito.
 *
 * O tipo é checado ANTES do tamanho de propósito: para um arquivo grande E de
 * formato errado, "formato não aceito" é a informação que resolve.
 */
export function validarArquivo(a: {
  mime: string;
  tamanho: number;
}): string | null {
  if (!extensaoDe(a.mime)) return ANEXO_TIPO_RECUSADO;
  if (a.tamanho <= 0) return ANEXO_VAZIO;
  if (a.tamanho > MAX_BYTES) return ANEXO_LIMITE_EXCEDIDO;
  return null;
}

/**
 * Nome de EXIBIÇÃO. Acentos e espaços internos são preservados — é o nome que o
 * usuário reconhece.
 *
 * Caracteres de controle saem: uma quebra de linha aqui sujaria o
 * `Content-Disposition`. As rotas já codificam com `filename*=UTF-8''`, mas
 * limpar na entrada é a defesa que não depende do consumidor lembrar.
 *
 * **Isto NÃO é o que protege o filesystem.** O que protege é o nome físico ser
 * gerado no servidor: este valor nunca entra na construção de um caminho.
 */
export function sanitizarNomeOriginal(nome: string): string {
  const limpo = nome
    // Faixa de controle C0 mais DEL: sao os que sujariam um header.
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 255);
  return limpo || "arquivo";
}

const formatador = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** Tamanho legível para a lista de anexos do card. */
export function formatarTamanho(bytes: number): string {
  const KB = 1024;
  const MB = KB * 1024;
  return bytes < MB
    ? `${formatador.format(bytes / KB)} KB`
    : `${formatador.format(bytes / MB)} MB`;
}

/**
 * Tipos servidos INLINE no download; o resto baixa como anexo.
 *
 * Só tipos da allowlist chegam ao ponto de download, então `inline` nunca serve
 * algo que o navegador executaria como documento.
 */
export const MIMES_INLINE: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
