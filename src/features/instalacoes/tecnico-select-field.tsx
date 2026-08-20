"use client";

import { useFormContext } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TecnicoOption } from "@/services/tecnico.service";

/** Sentinela de "sem técnico" — o Select do shadcn não aceita value vazio. */
const NENHUM = "__none__";

/**
 * Escolha do Técnico responsável (ADR-0408) — mesmo padrão do Vendedor no
 * cabeçalho da Proposta: `Select` alimentado no servidor com os ativos.
 *
 * As opções chegam prontas do service e já incluem os técnicos INATIVOS que
 * estejam vinculados, rotulados "(inativo)". É isso que impede o campo de
 * aparecer em branco quando alguém inativa um técnico já usado.
 */
export function TecnicoSelectField({
  name,
  label,
  options,
  opcional = false,
  disabled = false,
}: {
  name: string;
  label: string;
  options: TecnicoOption[];
  /** Quando true, oferece "Nenhum" e o valor pode ser null. */
  opcional?: boolean;
  disabled?: boolean;
}) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select
            value={field.value ?? (opcional ? NENHUM : "")}
            onValueChange={(v) => field.onChange(v === NENHUM ? null : v)}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o técnico" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {opcional && <SelectItem value={NENHUM}>Nenhum</SelectItem>}
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
