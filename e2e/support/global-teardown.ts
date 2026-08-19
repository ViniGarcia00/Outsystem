import "dotenv/config";

import { limparResiduosE2E } from "./limpeza";

/**
 * `globalTeardown` do Playwright (Sprint 4.0.3, ADR-0403).
 *
 * Roda **uma vez, depois da suíte inteira, inclusive quando há testes falhando**
 * — é essa a garantia de que um cenário interrompido no meio não deixa rastro.
 *
 * `dotenv/config` é obrigatório: este arquivo roda em um processo Node próprio,
 * fora do Next, e não herda o carregamento de `.env` da aplicação. Sem ele a
 * `DATABASE_URL` chegaria indefinida e a guarda de ambiente barraria a limpeza.
 *
 * O erro **propaga de propósito**. Um teardown que engole falha em silêncio
 * devolve exatamente o problema que esta Sprint veio resolver: resíduo
 * acumulando no banco sem ninguém perceber. Falhar aqui derruba a execução, e é
 * assim que se fica sabendo.
 */
export default async function globalTeardown(): Promise<void> {
  const { antes, depois } = await limparResiduosE2E();

  const removidos = Object.entries(antes)
    .map(([tabela, n]) => `${tabela}=${n}`)
    .join(" ");

  console.log(`[limpeza E2E] removidos: ${removidos}`);
  console.log(`[limpeza E2E] resíduo restante: ${JSON.stringify(depois)}`);
}
