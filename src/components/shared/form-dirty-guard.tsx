"use client";

import { useEffect } from "react";

import { useNavigationBlocker } from "./navigation-blocker";

interface FormDirtyGuardProps {
  /** `true` quando o formulário possui alterações não salvas. */
  when: boolean;
}

/**
 * Guarda reutilizável contra perda de dados. Enquanto `when` for verdadeiro:
 *
 * 1. marca a navegação como bloqueada no contexto global — os links da
 *    aplicação pedem confirmação antes de sair (ver SidebarNav);
 * 2. intercepta o `beforeunload` do navegador (recarregar/fechar aba / navegação
 *    externa), exibindo o aviso nativo de alterações não salvas.
 *
 * Não renderiza nada. Basta montar dentro de um formulário controlado por
 * React Hook Form: `<FormDirtyGuard when={form.formState.isDirty} />`.
 */
export function FormDirtyGuard({ when }: FormDirtyGuardProps) {
  const { setIsBlocked } = useNavigationBlocker();

  // Sincroniza o estado de bloqueio global com o "dirty" do formulário.
  useEffect(() => {
    setIsBlocked(when);
    return () => setIsBlocked(false);
  }, [when, setIsBlocked]);

  // Bloqueia recarregar/fechar aba e navegação externa (fora do Router).
  useEffect(() => {
    if (!when) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [when]);

  return null;
}
