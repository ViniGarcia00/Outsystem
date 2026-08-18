/**
 * Custos extras da Instalação (Sprint 4.0.2) — FONTE ÚNICA de cálculo.
 *
 * Nenhum total é persistido (ADR-0219): tudo é derivado dos custos lançados nos
 * registros da cronologia. A interface apenas apresenta o que sai daqui — não
 * existe soma espalhada por componente.
 *
 * O arredondamento abaixo endurece a FUNÇÃO DE CÁLCULO; ele não substitui a
 * persistência segura. No banco o valor é `Decimal(12, 2)`, nunca float:
 *
 *   Banco Decimal(12,2) → service (toNumber na borda) → aqui (soma + 2 casas)
 *                       → UI (formatCurrency)
 *
 * Custos são INTERNOS e operacionais: não alteram a Proposta, não recalculam
 * total comercial e não geram cobrança.
 *
 * Módulo PURO — testado sem banco.
 */

export type CategoriaCustoInstalacao =
  | "MATERIAL"
  | "MAO_DE_OBRA"
  | "DESLOCAMENTO"
  | "TERCEIROS"
  | "FRETE"
  | "OUTROS";

export const CATEGORIAS_CUSTO: CategoriaCustoInstalacao[] = [
  "MATERIAL",
  "MAO_DE_OBRA",
  "DESLOCAMENTO",
  "TERCEIROS",
  "FRETE",
  "OUTROS",
];

export interface CustoCalculavel {
  categoria: CategoriaCustoInstalacao;
  valor: number;
}

export interface RegistroCalculavel {
  custos: ReadonlyArray<CustoCalculavel>;
}

/**
 * Normaliza a 2 casas. Um total de custos agrega N linhas independentes e o
 * erro de ponto flutuante acumula (0.1 + 0.2 = 0.30000000000000004). É um
 * endurecimento local desta Sprint; `features/propostas/totais.ts` soma direto
 * e NÃO é alterado.
 */
const c2 = (valor: number): number => Math.round(valor * 100) / 100;

export function totalDoRegistro(
  custos: ReadonlyArray<CustoCalculavel>,
): number {
  return c2(custos.reduce((soma, c) => soma + c.valor, 0));
}

export function totalDaInstalacao(
  registros: ReadonlyArray<RegistroCalculavel>,
): number {
  return c2(registros.reduce((soma, r) => soma + totalDoRegistro(r.custos), 0));
}

export function totaisPorCategoria(
  registros: ReadonlyArray<RegistroCalculavel>,
): Record<CategoriaCustoInstalacao, number> {
  const totais = Object.fromEntries(
    CATEGORIAS_CUSTO.map((c) => [c, 0]),
  ) as Record<CategoriaCustoInstalacao, number>;

  for (const registro of registros) {
    for (const custo of registro.custos) {
      totais[custo.categoria] = c2(totais[custo.categoria] + custo.valor);
    }
  }
  return totais;
}
