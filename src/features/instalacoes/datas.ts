/**
 * Datas operacionais da Instalação (Sprint 4.0.1).
 *
 * O projeto não tinha campo de data em formulário até aqui, então estes
 * helpers definem a conversão nos dois sentidos entre `<input type="date">`
 * ("YYYY-MM-DD") e `Date`.
 *
 * **Fuso fixo `America/Sao_Paulo`, nunca o do servidor ou do navegador.** Uma
 * data escolhida como 18/08 precisa continuar 18/08 na leitura — parsear
 * "2026-08-18" como meia-noite UTC a exibiria como 17/08 no Brasil. Por isso a
 * data é ancorada ao MEIO-DIA do fuso brasileiro: qualquer conversão razoável
 * mantém o mesmo dia. O Brasil não adota horário de verão desde 2019, então o
 * deslocamento -03:00 é estável.
 *
 * Módulo PURO — testado sem banco.
 */

const FUSO_BRASIL = "-03:00";

const formatador = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** "YYYY-MM-DD" (ou "") → `Date` ancorada ao meio-dia de São Paulo, ou `null`. */
export function dataDeInput(valor: string): Date | null {
  const v = valor.trim();
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T12:00:00${FUSO_BRASIL}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `Date` → "YYYY-MM-DD" no fuso de São Paulo, para `<input type="date">`. */
export function dataParaInput(data: Date | null | undefined): string {
  if (!data) return "";
  const d = data instanceof Date ? data : new Date(data);
  return Number.isNaN(d.getTime()) ? "" : formatador.format(d);
}

/** Aceita o formato de `<input type="date">` ou vazio. */
export function ehDataDeInputValida(valor: string): boolean {
  const v = valor.trim();
  return v === "" || dataDeInput(v) !== null;
}
