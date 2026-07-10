"use client";

import { useRef } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { CabecalhoValores } from "./proposta-cabecalho";
import type { CabecalhoPatchValues } from "./schema";

/**
 * Finalização da proposta (ADR-0222) — informações comerciais finais do
 * cabeçalho da Proposta. Texto livre; NÃO entra em cálculos/totais/desconto/
 * frete. Self-contained no mesmo padrão do cabeçalho: cada campo comita no blur
 * chamando `onCampo` (patch parcial) — sem botão "Salvar".
 *
 * "Previsão de instalação" é exibida apenas no modelo **Completa**; a informação
 * continua armazenada normalmente (regra apenas de apresentação).
 */
export function FinalizacaoProposta({
  valores,
  simplificada,
  readOnly,
  onCampo,
}: {
  valores: CabecalhoValores;
  simplificada: boolean;
  readOnly: boolean;
  onCampo: (patch: CabecalhoPatchValues) => void | Promise<void>;
}) {
  // Últimos valores comitados (evita salvar sem mudança real).
  const ultimaFormaPagamento = useRef(valores.formaPagamento);
  const ultimaPrevisao = useRef(valores.previsaoInstalacao);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Finalização</h2>

      {/* Informações Comerciais */}
      <Card>
        <CardContent className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Informações Comerciais
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fin-forma-pagamento">Forma de pagamento</Label>
              <Textarea
                id="fin-forma-pagamento"
                rows={2}
                defaultValue={valores.formaPagamento}
                disabled={readOnly}
                placeholder="Ex.: 3x no Cartão de Crédito / 5% de Desconto no PIX"
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v !== ultimaFormaPagamento.current) {
                    ultimaFormaPagamento.current = v;
                    onCampo({ formaPagamento: v || null });
                  }
                }}
              />
            </div>

            {/* Previsão de instalação — apenas no modelo Completa. */}
            {!simplificada && (
              <div className="space-y-2">
                <Label htmlFor="fin-previsao">Previsão de instalação</Label>
                <Input
                  id="fin-previsao"
                  defaultValue={valores.previsaoInstalacao}
                  disabled={readOnly}
                  placeholder="Ex.: 2 dias úteis, conforme cronograma, a combinar"
                  onBlur={(e) => {
                    const v = e.target.value;
                    if (v !== ultimaPrevisao.current) {
                      ultimaPrevisao.current = v;
                      onCampo({ previsaoInstalacao: v || null });
                    }
                  }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </section>
  );
}
