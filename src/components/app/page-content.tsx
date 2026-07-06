import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Região principal de conteúdo de uma tela, com ritmo vertical consistente
 * entre seções/tabelas/formulários.
 */
export function PageContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>{children}</div>
  );
}
