import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/utils";

import type { InvestimentoProposta } from "./totais";

/**
 * Resumo do Investimento (Sprint 2.9.2) — consolida Automação + Serviços
 * Complementares no nível da proposta. Apenas apresentação: recebe o
 * `InvestimentoProposta` já calculado pela fonte única (`calcularInvestimento`),
 * nunca recalcula nada. Mesmo padrão visual do `RodapeTotais` (caixa à direita,
 * máscara BRL, total em destaque). NÃO altera o Total da Proposta/PDF.
 */
export function ResumoInvestimento({
  investimento,
}: {
  investimento: InvestimentoProposta;
}) {
  return (
    <div className="ml-auto w-full max-w-sm rounded-md border bg-card p-4 text-sm">
      <dl className="space-y-2">
        <Linha label="Investimento Automação" valor={investimento.automacao} />

        <Separator />

        <Linha
          label="Serviços Complementares"
          valor={investimento.complementar}
        />

        <Separator />

        <div className="flex items-center justify-between gap-6 text-base font-semibold">
          <dt>Investimento Total</dt>
          <dd className="tabular-nums">{formatCurrency(investimento.total)}</dd>
        </div>
      </dl>
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
