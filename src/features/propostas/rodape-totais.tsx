import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/utils";

import { calcularTotais, type ItemCalculavel } from "./totais";

/**
 * Rodapé financeiro da proposta — totais derivados dos itens em **tempo real**
 * (recalcula a cada re-render; sem persistência, sem botão de recalcular).
 * No modelo Simplificada, oculta **Total Serviços** e o **Subtotal = Total
 * Produtos** (os valores de serviço seguem existindo internamente — só a
 * apresentação muda). Valores à direita, máscara BRL. ADR-0219.
 */
export function RodapeTotais({
  itens,
  simplificada,
}: {
  itens: ReadonlyArray<ItemCalculavel>;
  simplificada: boolean;
}) {
  const { totalProdutos, totalServicos } = calcularTotais(itens);
  const subtotal = simplificada ? totalProdutos : totalProdutos + totalServicos;

  return (
    <div className="ml-auto w-full max-w-sm rounded-md border bg-card p-4 text-sm">
      <dl className="space-y-2">
        <div className="flex items-center justify-between gap-6">
          <dt className="text-muted-foreground">Total Produtos</dt>
          <dd className="tabular-nums">{formatCurrency(totalProdutos)}</dd>
        </div>
        {!simplificada && (
          <div className="flex items-center justify-between gap-6">
            <dt className="text-muted-foreground">Total Serviços</dt>
            <dd className="tabular-nums">{formatCurrency(totalServicos)}</dd>
          </div>
        )}
        <Separator />
        <div className="flex items-center justify-between gap-6 text-base font-semibold">
          <dt>Subtotal</dt>
          <dd className="tabular-nums">{formatCurrency(subtotal)}</dd>
        </div>
      </dl>
    </div>
  );
}
