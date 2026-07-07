"use client";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { CurrencyInput } from "./currency-input";

interface CurrencyFieldProps {
  name: string;
  label: string;
  description?: string;
}

/** Campo monetário (BRL) ligado ao React Hook Form. Valor numérico em reais. */
export function CurrencyField({ name, label, description }: CurrencyFieldProps) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <CurrencyInput
              name={field.name}
              value={typeof field.value === "number" ? field.value : 0}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
