"use client";

import { Plus, Trash2 } from "lucide-react";

import { CurrencyInput } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/utils";

import { CATEGORIAS_CUSTO, totalDoRegistro } from "./custos";
import { CATEGORIA_CUSTO_LABEL } from "./labels";
import type { CustoValues } from "./registro-schema";

/**
 * Linhas de custo dentro do diálogo do registro (Sprint 4.0.2).
 *
 * Estado CONTROLADO pelo diálogo — o projeto não usa `useFieldArray` em lugar
 * nenhum, e manter a consistência evita um segundo padrão de array em formulário.
 *
 * Não valida nada: a validação é do `registroSchema`. Este componente só edita.
 * O total exibido vem de `totalDoRegistro` — nenhuma soma é feita aqui.
 */
export function CustosEditor({
  custos,
  onChange,
  disabled = false,
}: {
  custos: CustoValues[];
  onChange: (custos: CustoValues[]) => void;
  disabled?: boolean;
}) {
  const alterar = (indice: number, patch: Partial<CustoValues>) =>
    onChange(custos.map((c, i) => (i === indice ? { ...c, ...patch } : c)));

  const remover = (indice: number) =>
    onChange(custos.filter((_, i) => i !== indice));

  const adicionar = () =>
    onChange([...custos, { categoria: "MATERIAL", descricao: "", valor: 0 }]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Custos extras</Label>
        {!disabled && (
          <Button type="button" variant="outline" size="sm" onClick={adicionar}>
            <Plus className="h-4 w-4" />
            Adicionar custo
          </Button>
        )}
      </div>

      {custos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum custo lançado neste acontecimento.
        </p>
      ) : (
        <div className="space-y-2">
          {custos.map((custo, indice) => (
            <div
              key={indice}
              data-testid="linha-custo"
              className="grid grid-cols-1 items-end gap-2 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto]"
            >
              <div className="space-y-1.5">
                <Label htmlFor={`custo-${indice}-categoria`}>Categoria</Label>
                <Select
                  value={custo.categoria}
                  onValueChange={(v) =>
                    alterar(indice, {
                      categoria: v as CustoValues["categoria"],
                    })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger id={`custo-${indice}-categoria`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_CUSTO.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORIA_CUSTO_LABEL[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`custo-${indice}-descricao`}>Descrição</Label>
                <Input
                  id={`custo-${indice}-descricao`}
                  value={custo.descricao}
                  onChange={(e) =>
                    alterar(indice, { descricao: e.target.value })
                  }
                  placeholder="Opcional"
                  disabled={disabled}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`custo-${indice}-valor`}>Valor</Label>
                <CurrencyInput
                  id={`custo-${indice}-valor`}
                  name={`custo-${indice}-valor`}
                  value={custo.valor}
                  onChange={(valor) => alterar(indice, { valor })}
                  disabled={disabled}
                />
              </div>

              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  aria-label="Remover custo"
                  onClick={() => remover(indice)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          <div className="flex justify-end gap-6 pt-1 text-sm font-medium">
            <span>Total do registro</span>
            <span className="tabular-nums">
              {formatCurrency(totalDoRegistro(custos))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
