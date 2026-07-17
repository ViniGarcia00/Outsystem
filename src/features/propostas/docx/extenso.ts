import extenso from "extenso";

/**
 * Valor monetário por extenso para o contrato (Sprint 3.1).
 *
 * Devolve só o texto — sem "R$" e sem parênteses: a cláusula 2.1 do template já
 * traz "o valor total de R$ {valorTotal} ({valorTotalExtenso})".
 *
 * O valor é fixado em 2 casas antes da conversão para evitar que a
 * representação binária do float vire centavos errados.
 */
export function valorPorExtenso(valor: number): string {
  if (!Number.isFinite(valor)) return "";
  const comVirgula = valor.toFixed(2).replace(".", ",");
  return extenso(comVirgula, { mode: "currency" });
}
