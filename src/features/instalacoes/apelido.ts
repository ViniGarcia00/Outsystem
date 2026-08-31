/**
 * Fallback de EXIBIÇÃO do apelido da Instalação (Sprint 4.5).
 *
 * Módulo puro: sem IO, sem Prisma, sem React — o mesmo padrão de `anexos.ts` e
 * `datas.ts`. Vive em `features/` e é consumido pelo mapper da listagem em
 * `instalacao.service.ts`, como `proposta.service.ts` já consome `totais.ts`.
 *
 * ── POR QUE EXISTE ──────────────────────────────────────────────────────────
 * A coluna Cliente saiu da tabela na Sprint 4.5. Com ela fora, a coluna Apelido
 * passou a ser o único lugar da linha onde o usuário reconhece DE QUEM é a
 * obra. Uma instalação sem apelido não pode exibir "—" enquanto houver nome de
 * cliente ou número para exibir.
 *
 * ── O QUE ISTO NÃO É ────────────────────────────────────────────────────────
 * Não é escrita. Nada aqui volta para `Instalacao.apelido`: não há migration,
 * não há backfill, e `getInstalacao` — que alimenta o input EDITÁVEL do
 * workspace — continua de fora deste fallback de propósito. Aplicá-lo lá faria
 * um apelido vazio virar o nome do cliente no próximo "Salvar", persistindo uma
 * decisão que o usuário nunca tomou.
 */

/**
 * Travessão de ausência. É o que `nomeCliente` devolve para um cliente sem nome
 * nem empresa — ausência de dado, não um nome. Deixá-lo passar traria de volta
 * exatamente o "—" que a regra da coluna proíbe.
 */
const AUSENTE = "—";

/**
 * O texto da coluna Apelido: o apelido, senão o nome do cliente, senão o
 * número. Sempre devolve algo — o número existe para toda instalação.
 */
export function apelidoExibido(
  apelido: string | null | undefined,
  clienteNome: string,
  numero: number,
): string {
  const proprio = apelido?.trim();
  if (proprio) return proprio;

  const cliente = clienteNome.trim();
  if (cliente && cliente !== AUSENTE) return cliente;

  return String(numero);
}
