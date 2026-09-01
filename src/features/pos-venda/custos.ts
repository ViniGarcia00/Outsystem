/**
 * Custos operacionais do Pós-venda (Sprint 4.6) — FONTE ÚNICA de cálculo.
 *
 * Nenhum total é persistido (ADR-0219): tudo é derivado dos custos lançados nos
 * registros da timeline. A interface apenas apresenta o que sai daqui — não
 * existe soma espalhada por componente.
 *
 * O arredondamento abaixo endurece a FUNÇÃO DE CÁLCULO; ele não substitui a
 * persistência segura. No banco o valor é `Decimal(12, 2)`, nunca float:
 *
 *   Banco Decimal(12,2) → service (toNumber na borda) → aqui (soma + 2 casas)
 *                       → UI (formatCurrency)
 *
 * ── OS DOIS HISTÓRICOS SÃO INDEPENDENTES ────────────────────────────────────
 * As funções aqui somam **um agregado de cada vez**. Não existe — e não deve
 * passar a existir — função que some Troca + OS: são processos distintos, e
 * criar a OS a partir de uma Troca **não copia custo algum** (spec §36).
 * Somá-los produziria um número que não responde a pergunta nenhuma: nem
 * "quanto custou fazer o produto chegar", nem "quanto custou consertá-lo".
 *
 * Custos são INTERNOS e operacionais: não alteram Proposta, não recalculam
 * total comercial e não geram cobrança.
 *
 * Módulo PURO — testado sem banco.
 */

import { CATEGORIAS_CUSTO, type CategoriaCustoPosVenda } from "./labels";

export interface CustoCalculavel {
  categoria: CategoriaCustoPosVenda;
  valor: number;
}

export interface RegistroCalculavel {
  custos: ReadonlyArray<CustoCalculavel>;
}

/**
 * Normaliza a 2 casas. Um total agrega N linhas independentes e o erro de ponto
 * flutuante acumula (0.1 + 0.2 = 0.30000000000000004). Mesmo endurecimento de
 * `features/instalacoes/custos.ts`.
 */
const c2 = (valor: number): number => Math.round(valor * 100) / 100;

/** Total de um acontecimento da timeline. */
export function totalDoRegistro(
  custos: ReadonlyArray<CustoCalculavel>,
): number {
  return c2(custos.reduce((soma, c) => soma + c.valor, 0));
}

/**
 * Custo acumulado de UM agregado — uma Troca **ou** uma OS, nunca a soma das
 * duas. O nome é genérico porque a operação é idêntica nos dois; a separação é
 * garantida por quem chama, que sempre passa os registros de um agregado só.
 */
export function totalAcumulado(
  registros: ReadonlyArray<RegistroCalculavel>,
): number {
  return c2(registros.reduce((soma, r) => soma + totalDoRegistro(r.custos), 0));
}

/** Totais por categoria, em ordem canônica. Categorias sem lançamento vêm zeradas. */
export function totaisPorCategoria(
  registros: ReadonlyArray<RegistroCalculavel>,
): Record<CategoriaCustoPosVenda, number> {
  const totais = Object.fromEntries(
    CATEGORIAS_CUSTO.map((c) => [c, 0]),
  ) as Record<CategoriaCustoPosVenda, number>;

  for (const registro of registros) {
    for (const custo of registro.custos) {
      totais[custo.categoria] = c2(totais[custo.categoria] + custo.valor);
    }
  }
  return totais;
}

export type { CategoriaCustoPosVenda };
