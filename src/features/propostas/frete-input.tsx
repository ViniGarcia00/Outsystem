"use client";

import type { ChangeEvent } from "react";

import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/utils";

/**
 * Campo de Frete — mesmo padrão visual/experiência do Desconto: input à esquerda
 * e a interpretação à direita, na mesma linha. O input inicia VAZIO (não
 * preenche automaticamente com "R$ 0,00"); a interpretação mostra "R$ X" ou "-"
 * quando vazio. Emite o valor numérico em reais.
 */
export function FreteInput({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, "");
    onChange(digits ? Number(digits) / 100 : 0);
  };

  const interpretacao = value > 0 ? formatCurrency(value) : "-";

  return (
    <div className="flex items-center gap-2">
      <Input
        inputMode="numeric"
        autoComplete="off"
        aria-label="Frete"
        disabled={disabled}
        placeholder="R$ 0,00"
        value={value > 0 ? formatCurrency(value) : ""}
        onChange={handleChange}
        className="h-8 w-32 text-right"
      />
      <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
        {interpretacao}
      </span>
    </div>
  );
}
