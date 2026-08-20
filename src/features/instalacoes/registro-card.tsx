"use client";

import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { RegistroDTO } from "@/services/instalacao-registro.service";
import { formatCurrency } from "@/utils";

import { totalDoRegistro } from "./custos";
import { dataHoraParaExibicao } from "./datas";
import { CATEGORIA_CUSTO_LABEL, TIPO_REGISTRO_LABEL } from "./labels";

/**
 * Um acontecimento da cronologia (Sprint 4.0.2).
 *
 * A data-hora usa `dataHoraParaExibicao` (fuso fixo), NUNCA o `formatDateTime`
 * de `@/utils`, que usa o fuso do runtime.
 *
 * Todos os botões são `type="button"`: o card vive dentro do `<form>` do
 * workspace e um `type` ausente submeteria o cabeçalho da instalação.
 *
 * O responsável exibido é `responsavelNome`, o SNAPSHOT — não o nome atual do
 * Técnico. Renomear o cadastro não reescreve um fato já registrado (ADR-0408).
 */
export function RegistroCard({
  registro,
  readOnly,
  onEditar,
  onExcluir,
}: {
  registro: RegistroDTO;
  readOnly: boolean;
  onEditar: (registro: RegistroDTO) => void;
  onExcluir: (registro: RegistroDTO) => void;
}) {
  const total = totalDoRegistro(registro.custos);

  return (
    <Card data-testid="registro-card">
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium tabular-nums">
                {dataHoraParaExibicao(registro.aconteceuEm)}
              </span>
              <Badge variant="secondary">
                {TIPO_REGISTRO_LABEL[registro.tipo]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Responsável: {registro.responsavelNome}
            </p>
          </div>

          {!readOnly && (
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onEditar(registro)}
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onExcluir(registro)}
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            </div>
          )}
        </div>

        <p className="whitespace-pre-wrap break-words text-sm">
          {registro.relatorio}
        </p>

        {registro.custos.length > 0 && (
          <>
            <Separator />
            <dl className="space-y-1 text-sm">
              {registro.custos.map((custo) => (
                <div key={custo.id} className="flex justify-between gap-4">
                  <dt className="min-w-0 break-words text-muted-foreground">
                    {CATEGORIA_CUSTO_LABEL[custo.categoria]}
                    {custo.descricao ? ` — ${custo.descricao}` : ""}
                  </dt>
                  <dd className="shrink-0 tabular-nums">
                    {formatCurrency(custo.valor)}
                  </dd>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between gap-4 font-medium">
                <dt>Total do registro</dt>
                <dd className="shrink-0 tabular-nums">
                  {formatCurrency(total)}
                </dd>
              </div>
            </dl>
          </>
        )}
      </CardContent>
    </Card>
  );
}
