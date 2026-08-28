"use client";

import { useRef } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/utils";

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
  const ultimoPrazo = useRef(valores.prazoExecucaoDiasUteis);
  const ultimaObsAceite = useRef(valores.observacoesAceite);

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

      {/* Contrato — campos que alimentam o contrato Rev. 4 (ADR-0416). Ficam em
          card próprio porque são CLÁUSULA, não material de venda: o usuário
          precisa ver que estes três vão para um documento assinado. */}
      <Card>
        <CardContent className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Contrato
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fin-prazo-execucao">
                Prazo de execução (dias úteis)
              </Label>
              <Input
                id="fin-prazo-execucao"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                defaultValue={valores.prazoExecucaoDiasUteis ?? ""}
                disabled={readOnly}
                placeholder="Ex.: 30"
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  // Inteiro positivo ou nada. Zero e negativo caem em null, e o
                  // Zod recusaria de qualquer forma.
                  const n = v === "" ? null : Math.trunc(Number(v));
                  const valido = n !== null && Number.isFinite(n) && n > 0 ? n : null;
                  if (valido !== ultimoPrazo.current) {
                    ultimoPrazo.current = valido;
                    onCampo({ prazoExecucaoDiasUteis: valido });
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Cláusula 3.1. O contrato já escreve “dias úteis”.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fin-parcela-final">Parcela final</Label>
              <Input
                id="fin-parcela-final"
                inputMode="numeric"
                autoComplete="off"
                disabled={readOnly}
                placeholder="R$ 0,00"
                /* Vazio quando não informado — "não informado" e "zero" são
                   estados diferentes: o primeiro bloqueia a geração do
                   contrato, o segundo é um valor válido. */
                value={
                  valores.valorParcelaFinal === null
                    ? ""
                    : formatCurrency(valores.valorParcelaFinal)
                }
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  onCampo({
                    valorParcelaFinal: digits ? Number(digits) / 100 : null,
                  });
                }}
              />
              <p className="text-xs text-muted-foreground">
                Anexo II — exigível no aceite.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fin-obs-aceite">Observações do Termo de Aceite</Label>
            <Textarea
              id="fin-obs-aceite"
              rows={2}
              defaultValue={valores.observacoesAceite}
              disabled={readOnly}
              placeholder="Aparecem no Anexo II. Deixe em branco se não houver."
              onBlur={(e) => {
                const v = e.target.value;
                if (v !== ultimaObsAceite.current) {
                  ultimaObsAceite.current = v;
                  onCampo({ observacoesAceite: v || null });
                }
              }}
            />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
