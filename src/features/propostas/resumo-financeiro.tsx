import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/utils";

import { DescontoInput } from "./desconto-input";
import { FreteInput } from "./frete-input";
import type { Desconto, ResumoFinanceiro as ResumoFinanceiroValores } from "./totais";

/**
 * Resumo Financeiro (Sprint 2.9.4) — **tabela financeira única** da proposta.
 * Estrutura: grupo "Automação" (Produtos/Serviços/Subtotal) → grupo Serviços
 * Complementares (Som/Wi-Fi/Subtotal) → Total (soma dos dois subtotais) →
 * Desconto (INCIDE SOBRE O TOTAL) e Frete (editáveis) → Total Geral. Os valores
 * derivam da fonte única (`calcularResumoFinanceiro`); nada é recalculado aqui.
 *
 * As linhas "Projeto Som Ambiente" / "Projeto Wi-Fi Premium", o Subtotal dos
 * serviços e a linha "Total" só aparecem quando existe pelo menos um serviço
 * adicionado (`som`/`wifi` = null ⇒ não adicionado). No modelo Simplificada os
 * serviços não existem e o grupo Automação mostra apenas Produtos/Subtotal.
 */
export function ResumoFinanceiro({
  resumo,
  som,
  wifi,
  simplificada,
  desconto,
  onDescontoChange,
  frete,
  onFreteChange,
  readOnly,
}: {
  resumo: ResumoFinanceiroValores;
  /** valorTotal do Som, ou null quando o serviço não foi adicionado. */
  som: number | null;
  /** valorTotal do Wi-Fi, ou null quando o serviço não foi adicionado. */
  wifi: number | null;
  simplificada: boolean;
  desconto: Desconto;
  onDescontoChange: (desconto: Desconto) => void;
  frete: number;
  onFreteChange: (frete: number) => void;
  readOnly: boolean;
}) {
  const temServicos = !simplificada && (som !== null || wifi !== null);

  return (
    <div className="ml-auto w-full max-w-sm rounded-md border bg-card p-4 text-sm">
      <h3 className="mb-3 text-sm font-semibold">Resumo Financeiro</h3>
      <dl className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Automação
        </p>
        <Linha label="Produtos" valor={resumo.produtos} />
        {!simplificada && <Linha label="Serviços" valor={resumo.servicos} />}
        <Linha label="Subtotal" valor={resumo.subtotalAutomacao} />

        {temServicos && (
          <>
            <Separator />
            {som !== null && (
              <Linha label="Projeto Som Ambiente" valor={som} />
            )}
            {wifi !== null && (
              <Linha label="Projeto Wi-Fi Premium" valor={wifi} />
            )}
            <Linha label="Subtotal" valor={resumo.subtotalServicos} />
            <Separator />
            <Linha label="Total" valor={resumo.total} negrito />
          </>
        )}

        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Desconto</dt>
          <dd>
            <DescontoInput
              value={desconto}
              onChange={onDescontoChange}
              subtotal={resumo.total}
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
          <dt>Total Geral</dt>
          <dd className="tabular-nums">{formatCurrency(resumo.totalGeral)}</dd>
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

function Linha({
  label,
  valor,
  negrito,
}: {
  label: string;
  valor: number;
  negrito?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-6${negrito ? " font-medium" : ""}`}
    >
      <dt className={negrito ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd className="tabular-nums">{formatCurrency(valor)}</dd>
    </div>
  );
}
