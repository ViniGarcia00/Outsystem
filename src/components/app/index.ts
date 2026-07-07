// Biblioteca de componentes de ALTO NÍVEL da aplicação.
// Toda tela do sistema é construída a partir daqui para garantir um
// padrão visual único (mesma moldura em Clientes, Produtos, Vendedores,
// Configurações e Propostas).

export { AppPage } from "./app-page";
export { PageHeader } from "./page-header";
export { PageFilters } from "./page-filters";
export { PageContent } from "./page-content";
export { PageTable } from "./page-table";
export { PageForm } from "./page-form";
export { PageEmpty } from "./page-empty";
export { PagePagination, type PagePaginationProps } from "./page-pagination";
export { CrudLayout } from "./crud-layout";
export { CrudListView, type CrudColumn } from "./crud-list-view";
export { CrudFormShell } from "./crud-form-shell";
export { RowActions } from "./row-actions";
export { StatusBadge } from "./status-badge";
