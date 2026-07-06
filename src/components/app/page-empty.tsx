import type { ComponentProps } from "react";

import { EmptyState } from "@/components/shared";

/**
 * Estado vazio padrão das telas. Fino invólucro sobre `EmptyState` para expor
 * o componente pela biblioteca de alto nível (`@/components/app`) e permitir
 * evolução futura sem alterar os consumidores.
 */
export function PageEmpty(props: ComponentProps<typeof EmptyState>) {
  return <EmptyState {...props} />;
}
