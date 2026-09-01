"use client";

import { formatCurrency } from "@/utils";

import { totaisPorCategoria, totalAcumulado } from "./custos";
import { CATEGORIAS_CUSTO, CATEGORIA_CUSTO_LABEL } from "./labels";
import type { RegistroPosVendaDTO } from "./tipos";

/**
 * Resumo financeiro operacional de UM agregado do Pós-venda (Sprint 4.6).
 *
 * Tudo é DERIVADO — nenhum total é persistido. As duas chamadas ao módulo
 * `custos.ts` são a única fonte; este componente não soma nada por conta.
 *
 * ── O RÓTULO É PARTE DA REGRA ───────────────────────────────────────────────
 * `titulo` vem por prop e diz DE QUEM é o custo ("Custo acumulado da troca" /
 * "…da ordem de serviço"). Não é decoração: custos de Troca e de OS são
 * históricos independentes e nunca se somam (spec §36). Um rótulo genérico
 * como "Custos" numa tela e na outra convidaria a leitura errada — a de que os
 * dois números pertencem ao mesmo bolso.
 *
 * Só categorias COM lançamento aparecem. Como a enum é uma só para os dois
 * submódulos (ADR-0418), é esse filtro que garante que "Motoboy" nunca apareça
 * numa OS que não teve motoboy.
 */
export function ResumoCustosPosVenda({
  titulo,
  registros,
}: {
  titulo: string;
  registros: RegistroPosVendaDTO[];
}) {
  const total = totalAcumulado(registros);
  const porCategoria = totaisPorCategoria(registros);
  const comLancamento = CATEGORIAS_CUSTO.filter((c) => porCategoria[c] > 0);

  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{titulo}</p>
          <p
            className="text-2xl font-semibold tabular-nums"
            data-testid="custo-acumulado"
          >
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
            <div key={categoria} className="flex justify-between gap-4">
              <dt className="min-w-0 break-words text-muted-foreground">
                {CATEGORIA_CUSTO_LABEL[categoria]}
              </dt>
              <dd className="shrink-0 tabular-nums">
                {formatCurrency(porCategoria[categoria])}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
