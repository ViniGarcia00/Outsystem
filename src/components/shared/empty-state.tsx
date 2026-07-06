import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Botão(ões) opcional(is) — ex.: "Novo cliente". */
  action?: ReactNode;
  className?: string;
}

/**
 * Estado vazio padrão do sistema. Construído sobre os primitivos `Empty` do
 * shadcn/ui para um visual moderno e consistente. Reutilizável em todas as
 * telas (listas sem dados, telas em construção, resultados de busca vazios).
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Empty
      className={cn(
        "rounded-xl border border-dashed bg-card/40 py-14",
        className,
      )}
    >
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-12 rounded-xl [&_svg:not([class*='size-'])]:size-6"
        >
          <Icon aria-hidden />
        </EmptyMedia>
        <EmptyTitle className="text-base">{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
