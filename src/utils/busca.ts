/**
 * Normalização de busca — FONTE ÚNICA do sistema (Sprint 4.0.3, ADR-0402).
 *
 * Toda comparação textual de busca passa por aqui: listagens client-side
 * (`useCrudList`), autocompletes server-side (Clientes, Produtos, Propostas) e
 * o agrupamento por SKU do PDF Geral de Produtos.
 *
 * **Não reescrever `.normalize()` em componente, hook ou service.** Espalhar a
 * expressão foi exatamente o que permitiu que a busca do banco divergisse da
 * busca da tela: `useCrudList` normalizava acentos desde sempre, enquanto os
 * autocompletes usavam `contains + mode: "insensitive"` do Prisma — que vira
 * `ILIKE` no PostgreSQL, insensível a caixa mas SENSÍVEL a acento. "Thaís" não
 * aparecia ao digitar "Thais".
 *
 * Por que a normalização acontece em memória e não no banco: `unaccent` exigiria
 * `CREATE EXTENSION` com superusuário, e o ADR-0101 determina que a aplicação use
 * o usuário dedicado `outmat`, que não é superusuário. Ver ADR-0402 e o item de
 * busca server-side escalável no BACKLOG.
 *
 * Módulo PURO — sem estado, sem IO, testado sem banco.
 */

/**
 * Minúsculas, Unicode NFD, sem diacríticos.
 *
 * Números, pontuação e demais caracteres passam intactos: "CM10-A" continua
 * "cm10-a". String vazia devolve string vazia.
 *
 * @example normalizarBusca("Thaís")     // "thais"
 * @example normalizarBusca("AUTOMAÇÃO") // "automacao"
 */
export function normalizarBusca(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * `true` quando `texto` contém `query`, ambos normalizados — busca por qualquer
 * parte do texto, ignorando caixa e acento.
 *
 * Query vazia (ou só espaços) casa com tudo: é o estado "sem filtro", e é assim
 * que as listagens já se comportavam antes desta centralização.
 */
export function contemBusca(texto: string, query: string): boolean {
  const alvo = normalizarBusca(query.trim());
  if (!alvo) return true;
  return normalizarBusca(texto).includes(alvo);
}
