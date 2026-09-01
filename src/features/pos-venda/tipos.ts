/**
 * Tipos do Pós-venda usados pelos componentes de interface (Sprint 4.6).
 *
 * Reexportação **type-only** dos DTOs do service. Existe por dois motivos:
 *
 * 1. Os componentes compartilhados (timeline, card, diálogo, anexos) servem à
 *    Troca **e** à OS. Se cada um importasse do service do seu submódulo, os
 *    componentes precisariam de dois conjuntos de props com a mesma forma.
 * 2. Um `import type` de um módulo de servidor é apagado na compilação e nunca
 *    arrasta código de servidor para o bundle do cliente — é o padrão já usado
 *    em `proposta-autocomplete.tsx` e `cliente-autocomplete.tsx`. Concentrar os
 *    reexports aqui deixa isso explícito num lugar só, em vez de repetir o
 *    comentário "type-only" em cada componente.
 *
 * **Nada além de tipo pode ser reexportado daqui.**
 */

export type {
  AnexoPosVendaDTO,
  CustoPosVendaDTO,
  RegistroPosVendaDTO,
} from "@/services/pos-venda-troca-registro.service";

export type {
  ItemTrocaDTO,
  PendenciaRetorno,
  TrocaDetalhe,
  TrocaListItem,
  TrocaSuggestion,
} from "@/services/pos-venda-troca.service";

export type {
  ItemOSDTO,
  OSDetalhe,
  OSListItem,
} from "@/services/pos-venda-os.service";
