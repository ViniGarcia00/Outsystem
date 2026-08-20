import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: string;
  /**
   * Colunas do grid de campos (padrão: 2). Use 1 para textareas em largura
   * total e 3 para trios de campos curtos (evita o campo órfão de meia linha).
   */
  cols?: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
}

const COLS_CLASS: Record<1 | 2 | 3, string> = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
};

/**
 * Agrupador de campos de formulário com título — padrão único em todos os
 * cadastros (Configuração, Clientes, Produtos, Vendedores).
 */
export function FormSection({
  title,
  cols = 2,
  children,
  className,
}: FormSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <div className={cn("grid gap-4", COLS_CLASS[cols])}>{children}</div>
    </section>
  );
}
