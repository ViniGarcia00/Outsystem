import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  /** Elemento exibido ao lado do título (ex.: badge de status). Opcional. */
  titleSuffix?: ReactNode;
  description?: string;
  /** Ações à direita — ex.: botão "Novo". */
  actions?: ReactNode;
}

/**
 * Cabeçalho padrão de tela: título, descrição opcional e área de ações.
 * Usado no topo de TODAS as telas do sistema.
 */
export function PageHeader({
  title,
  titleSuffix,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {titleSuffix}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
