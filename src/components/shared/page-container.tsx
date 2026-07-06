import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Container padrão de página: largura máxima e espaçamento consistentes. */
export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-10 lg:px-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
