"use client";

import type { ComponentProps } from "react";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type MaskedFieldProps = Omit<
  ComponentProps<typeof Input>,
  "name" | "onChange" | "value"
> & {
  name: string;
  label: string;
  description?: string;
  /** Formata o valor digitado (ex.: `formatCpfCnpj`, `formatPhone`). */
  format: (raw: string) => string;
};

/**
 * Campo de texto com máscara de exibição ligado ao React Hook Form.
 * Armazena o valor já formatado (consistente para busca e unicidade).
 */
export function MaskedField({
  name,
  label,
  description,
  format,
  ...inputProps
}: MaskedFieldProps) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={field.value ?? ""}
              onChange={(event) => field.onChange(format(event.target.value))}
              {...inputProps}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
