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
import { Textarea } from "@/components/ui/textarea";

type TextareaFieldProps = Omit<ComponentProps<typeof Textarea>, "name"> & {
  name: string;
  label: string;
  description?: string;
};

/** Campo de texto longo ligado ao React Hook Form. */
export function TextareaField({
  name,
  label,
  description,
  ...textareaProps
}: TextareaFieldProps) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea {...field} value={field.value ?? ""} {...textareaProps} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
