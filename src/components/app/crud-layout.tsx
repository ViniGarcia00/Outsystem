"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

import { AppPage } from "./app-page";
import { PageContent } from "./page-content";
import { PageEmpty } from "./page-empty";
import { PageFilters } from "./page-filters";
import { PageHeader } from "./page-header";
import { PageTable } from "./page-table";
import type { PagePaginationProps } from "./page-pagination";

interface CrudLayoutProps<TData, TValue> {
  // Cabeçalho
  title: string;
  description?: string;

  // Busca
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  // Botão "Novo"
  onNew?: () => void;
  newLabel?: string;

  // Tabela
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;

  // Estado vazio (rico)
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Substitui completamente o estado vazio padrão, se necessário. */
  emptyState?: ReactNode;

  // Paginação
  pagination?: PagePaginationProps;

  // Extras
  /** Filtros adicionais na barra de filtros. */
  filters?: ReactNode;
  /** Ações extras no cabeçalho, à esquerda do botão "Novo". */
  headerActions?: ReactNode;
}

/**
 * Layout CRUD padrão do sistema — SOMENTE ESTRUTURA (sem regra de negócio).
 * Reúne título, descrição, pesquisa, botão "Novo", área da tabela, paginação
 * e estado vazio. Garante que todas as telas de listagem sejam idênticas.
 *
 * A tela fornece dados (`columns`/`data`) e reage aos callbacks; este layout
 * não busca, filtra nem persiste nada.
 */
export function CrudLayout<TData, TValue>({
  title,
  description,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  onNew,
  newLabel = "Novo",
  columns,
  data,
  loading,
  emptyIcon,
  emptyTitle = "Nenhum registro encontrado",
  emptyDescription,
  emptyState,
  pagination,
  filters,
  headerActions,
}: CrudLayoutProps<TData, TValue>) {
  const novoButton = onNew ? (
    <Button onClick={onNew}>
      <Plus className="h-4 w-4" />
      {newLabel}
    </Button>
  ) : null;

  const empty = emptyState ?? (
    <PageEmpty
      icon={emptyIcon}
      title={emptyTitle}
      description={emptyDescription}
    />
  );

  const hasFilterBar = onSearchChange !== undefined || filters !== undefined;

  return (
    <AppPage>
      <PageHeader
        title={title}
        description={description}
        actions={
          headerActions || novoButton ? (
            <>
              {headerActions}
              {novoButton}
            </>
          ) : undefined
        }
      />

      {hasFilterBar && (
        <PageFilters
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
        >
          {filters}
        </PageFilters>
      )}

      <PageContent>
        <PageTable
          columns={columns}
          data={data}
          loading={loading}
          empty={empty}
          pagination={pagination}
        />
      </PageContent>
    </AppPage>
  );
}
