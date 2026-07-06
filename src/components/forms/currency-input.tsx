"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/utils";

type CurrencyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type" | "inputMode"
> & {
  /** Valor numérico em reais (ex.: 1234.5). */
  value?: number;
  /** Emite o valor numérico atualizado. */
  onChange?: (value: number) => void;
};

/**
 * Campo monetário (BRL) pronto para React Hook Form (via Controller).
 * Mantém o valor como número; a máscara é apenas de exibição.
 */
export const CurrencyInput = React.forwardRef<
  HTMLInputElement,
  CurrencyInputProps
>(({ value, onChange, ...props }, ref) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, "");
    const numeric = digits ? Number(digits) / 100 : 0;
    onChange?.(numeric);
  };

  return (
    <Input
      ref={ref}
      inputMode="numeric"
      value={formatCurrency(value ?? 0)}
      onChange={handleChange}
      {...props}
    />
  );
});

CurrencyInput.displayName = "CurrencyInput";
