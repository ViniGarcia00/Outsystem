/**
 * Superfície pública do módulo Pós-venda (Sprint 4.6).
 *
 * As páginas do App Router importam daqui; nada fora do módulo importa de um
 * arquivo interno. Mesmo padrão de `features/instalacoes/index.ts`.
 */

export { PosVendaHub } from "./hub";

export { TrocasList } from "./trocas/trocas-list";
export { NovaTrocaForm } from "./trocas/nova-troca-form";
export { TrocaWorkspace } from "./trocas/troca-workspace";

export { OrdensServicoList } from "./ordens-servico/os-list";
export { NovaOSForm } from "./ordens-servico/nova-os-form";
export { OrdemServicoWorkspace } from "./ordens-servico/os-workspace";
