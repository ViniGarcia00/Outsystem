"use client";

import { createContext, useContext, useMemo, useState } from "react";

/**
 * Estado global de "navegação bloqueada" (formulário com alterações não salvas).
 *
 * Padrão oficial do Next.js (App Router): um contexto compartilha o estado de
 * bloqueio; os links da navegação consultam `isBlocked` no seu `onNavigate` e
 * cancelam a transição quando o usuário não confirma a saída.
 * Ver: FormDirtyGuard e SidebarNav.
 */

interface NavigationBlockerContextValue {
  isBlocked: boolean;
  setIsBlocked: (blocked: boolean) => void;
}

const NavigationBlockerContext = createContext<NavigationBlockerContextValue>({
  isBlocked: false,
  setIsBlocked: () => {},
});

export function NavigationBlockerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isBlocked, setIsBlocked] = useState(false);
  const value = useMemo(() => ({ isBlocked, setIsBlocked }), [isBlocked]);

  return (
    <NavigationBlockerContext.Provider value={value}>
      {children}
    </NavigationBlockerContext.Provider>
  );
}

export function useNavigationBlocker() {
  return useContext(NavigationBlockerContext);
}

/** Mensagem única de confirmação de saída com alterações não salvas. */
const UNSAVED_CHANGES_MESSAGE =
  "Existem alterações não salvas. Deseja sair mesmo assim? As alterações serão perdidas.";

/**
 * Confirmação síncrona de saída — compatível com `onNavigate` do `<Link>`
 * (que exige decisão imediata). Retorna `true` se o usuário confirma a saída.
 */
export function confirmDiscardChanges(): boolean {
  return window.confirm(UNSAVED_CHANGES_MESSAGE);
}
