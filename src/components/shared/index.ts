// Primitivos compartilhados de baixo nível.
// Componentes de alto nível (páginas/CRUD) ficam em `@/components/app`.

export { Loading } from "./loading";
export { EmptyState } from "./empty-state";
export { SearchInput } from "./search-input";
export { ConfirmDialog } from "./confirm-dialog";
export { ThemeToggle } from "./theme-toggle";
export { FormDirtyGuard } from "./form-dirty-guard";
export {
  NavigationBlockerProvider,
  useNavigationBlocker,
  confirmDiscardChanges,
} from "./navigation-blocker";
