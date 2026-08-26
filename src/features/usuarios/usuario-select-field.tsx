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
import type { UsuarioOption } from "@/services/usuario.service";

/** Sentinela de "sem usuário" — o Select do shadcn não aceita value vazio. */
const NENHUM = "__none__";

/**
 * Escolha de um Usuário para um PAPEL (ADR-0410) — mesmo padrão do Vendedor no
 * cabeçalho da Proposta: `Select` alimentado no servidor.
 *
 * As opções chegam prontas do service e já incluem os usuários INDISPONÍVEIS
 * que estejam vinculados, rotulados. São **duas** as causas de
 * indisponibilidade: a pessoa foi inativada (`Nome (inativo)`) ou perdeu o
 * papel (`Nome (sem papel de técnico)`). É isso que impede o campo de aparecer
 * em branco quando alguém inativa ou desmarca o papel de quem já estava
 * vinculado.
 *
 * Serve aos dois papéis — daí o `placeholder` ser parametrizado.
 */
export function UsuarioSelectField({
  name,
  label,
  options,
  placeholder = "Selecione",
  opcional = false,
  disabled = false,
}: {
  name: string;
  label: string;
  options: UsuarioOption[];
  /** Texto do campo vazio. Ex.: "Selecione o técnico". */
  placeholder?: string;
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
                <SelectValue placeholder={placeholder} />
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
