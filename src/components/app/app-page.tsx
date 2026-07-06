import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Casca padrão de uma tela. Define largura máxima, respiro e o ritmo vertical
 * entre as regiões (`PageHeader`, `PageFilters`, `PageContent`, ...).
 *
 * Toda tela do sistema começa com `<AppPage>` — é o que garante que Clientes,
 * Produtos, Vendedores, Configurações e Propostas tenham a mesma moldura.
 */
export function AppPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10 lg:px-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
