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

type NumberFieldProps = Omit<
  ComponentProps<typeof Input>,
  "name" | "type" | "value" | "onChange"
> & {
  name: string;
  label: string;
  description?: string;
};

/**
 * Campo numérico (inteiro) ligado ao React Hook Form. Mantém o valor como
 * `number` no estado do formulário (vazio → `undefined`).
 */
export function NumberField({
  name,
  label,
  description,
  ...inputProps
}: NumberFieldProps) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              inputMode="numeric"
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={field.value ?? ""}
              onChange={(event) =>
                field.onChange(
                  event.target.value === ""
                    ? undefined
                    : Number(event.target.value),
                )
              }
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
