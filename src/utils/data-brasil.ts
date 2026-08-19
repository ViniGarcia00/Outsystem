/**
 * Fuso horário brasileiro — FONTE ÚNICA do sistema (Sprint 4.0.3, ADR-0405).
 *
 * Módulo **transversal**: `utils/` não depende de nada para fora, então tanto
 * `features/instalacoes` quanto `features/dashboard` podem consumi-lo sem que
 * uma feature passe a depender da outra.
 *
 * Não confundir com `utils/format/date.ts`: aquele **formata para exibição** e
 * deliberadamente NÃO fixa timezone (usa a do runtime), porque é compartilhado
 * com Propostas e mudá-lo alteraria aquele módulo. Aqui o fuso é fixo e
 * explícito, para as decisões de domínio que dependem de "que dia é hoje no
 * Brasil".
 *
 * Módulo PURO — sem estado, sem IO, testado sem banco.
 */

/** Fuso oficial do domínio (IANA), para `Intl.DateTimeFormat`. */
export const FUSO_BRASIL = "America/Sao_Paulo";

/**
 * O mesmo fuso como offset, para construir `Date` a partir de texto ISO.
 *
 * O Brasil não adota horário de verão desde 2019, então -03:00 é estável. Se um
 * dia voltar, este é o ponto único a revisar.
 */
export const OFFSET_BRASIL = "-03:00";

/** "YYYY-MM-DD" no fuso brasileiro (o locale en-CA produz exatamente isso). */
const formatadorIso = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: FUSO_BRASIL,
});

/**
 * Início do dia (00:00) no fuso brasileiro.
 *
 * Base de comparação para "a partir de hoje": às 22h de São Paulo já é o dia
 * seguinte em UTC, e usar a data do servidor faria uma instalação agendada para
 * hoje sumir do Dashboard antes da hora.
 *
 * @example inicioDoDiaBrasil(new Date("2026-08-20T01:00:00Z")) // 19/08 00:00 -03:00
 */
export function inicioDoDiaBrasil(agora: Date = new Date()): Date {
  return new Date(`${formatadorIso.format(agora)}T00:00:00${OFFSET_BRASIL}`);
}
