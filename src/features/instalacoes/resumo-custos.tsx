"use client";

import type { RegistroDTO } from "@/services/instalacao-registro.service";
import { formatCurrency } from "@/utils";

import { CATEGORIAS_CUSTO, totaisPorCategoria, totalDaInstalacao } from "./custos";
import { CATEGORIA_CUSTO_LABEL } from "./labels";

/**
 * Resumo financeiro operacional da instalação (Sprint 4.0.2).
 *
 * Tudo é DERIVADO — nenhum total é persistido. As duas chamadas ao módulo
 * `custos.ts` são a única fonte; este componente não soma nada por conta.
 */
export function ResumoCustos({ registros }: { registros: RegistroDTO[] }) {
  const total = totalDaInstalacao(registros);
  const porCategoria = totaisPorCategoria(registros);
  const comLancamento = CATEGORIAS_CUSTO.filter((c) => porCategoria[c] > 0);

  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Custos extras acumulados
          </p>
          <p className="text-2xl font-semibold tabular-nums">
            {formatCurrency(total)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Registros</p>
          <p className="text-2xl font-semibold tabular-nums">
            {registros.length}
          </p>
        </div>
      </div>

      {comLancamento.length > 0 && (
        <dl className="mt-4 space-y-1 border-t pt-3 text-sm">
          {comLancamento.map((categoria) => (
            <div key={categoria} className="flex justify-between gap-6">
              <dt className="text-muted-foreground">
                {CATEGORIA_CUSTO_LABEL[categoria]}
              </dt>
              <dd className="tabular-nums">
                {formatCurrency(porCategoria[categoria])}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
