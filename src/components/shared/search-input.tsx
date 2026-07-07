"use client";

import { Search } from "lucide-react";
import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchInputProps = ComponentProps<typeof Input> & {
  containerClassName?: string;
};

/** Campo de busca com ícone. Encapsula o Input com um prefixo de pesquisa. */
export function SearchInput({
  className,
  containerClassName,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        aria-label="Buscar"
        className={cn("pl-9", className)}
        placeholder="Buscar..."
        {...props}
      />
    </div>
  );
}
