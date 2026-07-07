import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/utils";

import { DescontoInput } from "./desconto-input";
import { FreteInput } from "./frete-input";
import { calcularTotais, type Desconto, type ItemCalculavel } from "./totais";

/**
 * Rodapé financeiro da proposta — totais derivados dos itens + desconto em
 * **tempo real** (recalcula a cada re-render; sem persistência dos totais, sem
 * botão de recalcular). No modelo Simplificada, oculta **Total Serviços** e o
 * **Subtotal = Total Produtos** (valores de serviço seguem existindo
 * internamente). Fluxo: Subtotal → Desconto → Total da Proposta. Valores à
 * direita, máscara BRL. ADR-0219/0220.
 */
export function RodapeTotais({
  itens,
  simplificada,
  desconto,
  onDescontoChange,
  frete,
  onFreteChange,
  readOnly,
}: {
  itens: ReadonlyArray<ItemCalculavel>;
  simplificada: boolean;
  desconto: Desconto;
  onDescontoChange: (desconto: Desconto) => void;
  frete: number;
  onFreteChange: (frete: number) => void;
  readOnly: boolean;
}) {
  const t = calcularTotais(itens, simplificada, desconto, frete);

  return (
    <div className="ml-auto w-full max-w-sm rounded-md border bg-card p-4 text-sm">
      <dl className="space-y-2">
        <Linha label="Total Produtos" valor={t.totalProdutos} />
        {!simplificada && <Linha label="Total Serviços" valor={t.totalServicos} />}

        <Separator />

        <Linha label="Subtotal" valor={t.subtotal} />

        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Desconto</dt>
          <dd>
            <DescontoInput
              value={desconto}
              onChange={onDescontoChange}
              subtotal={t.subtotal}
              disabled={readOnly}
            />
          </dd>
        </div>

        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Frete</dt>
          <dd>
            <FreteInput value={frete} onChange={onFreteChange} disabled={readOnly} />
          </dd>
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-6 text-base font-semibold">
          <dt>Total da Proposta</dt>
          <dd className="tabular-nums">{formatCurrency(t.totalProposta)}</dd>
        </div>
      </dl>

      {!readOnly && (
        <p className="mt-3 text-xs text-muted-foreground">
          Digite um valor para desconto em reais ou acrescente % para desconto
          percentual.
        </p>
      )}
    </div>
  );
}

function Linha({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{formatCurrency(valor)}</dd>
    </div>
  );
}
