"use client";

import { useEffect } from "react";

interface FormShortcutsOptions {
  /** CTRL+S / CMD+S — salvar. */
  onSave?: () => void;
  /** ESC — cancelar. */
  onCancel?: () => void;
  /** Desabilita os atalhos (ex.: durante o salvamento). */
  enabled?: boolean;
}

/**
 * Atalhos de teclado padrão dos formulários do sistema:
 * - CTRL+S (ou CMD+S): salvar (previne o "salvar página" do navegador);
 * - ESC: cancelar.
 *
 * Uso: `useFormShortcuts({ onSave: form.handleSubmit(submit), onCancel })`.
 */
export function useFormShortcuts({
  onSave,
  onCancel,
  enabled = true,
}: FormShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event: KeyboardEvent) => {
      const isSave =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "s";

      if (isSave && onSave) {
        event.preventDefault();
        onSave();
        return;
      }

      if (event.key === "Escape" && onCancel) {
        event.preventDefault();
        onCancel();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSave, onCancel, enabled]);
}
