"use client";

import { Copy, Download, Plus, Save, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageActionsProps {
  /** Cada ação só é exibida quando o handler correspondente é informado. */
  onNew?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onExport?: () => void;
  /** Estado de salvamento (desabilita "Salvar"). */
  saving?: boolean;
  /** Ações customizadas adicionais à direita. */
  children?: ReactNode;
  className?: string;
}

/**
 * Barra de ações de página, reutilizável em TODAS as telas
 * (Novo, Salvar, Cancelar, Excluir, Duplicar, Exportar).
 *
 * Cada botão aparece somente quando seu respectivo handler é fornecido,
 * mantendo a barra enxuta por tela.
 */
export function PageActions({
  onNew,
  onSave,
  onCancel,
  onDelete,
  onDuplicate,
  onExport,
  saving = false,
  children,
  className,
}: PageActionsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {onExport && (
        <Button variant="outline" onClick={onExport}>
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      )}
      {onDuplicate && (
        <Button variant="outline" onClick={onDuplicate}>
          <Copy className="h-4 w-4" />
          Duplicar
        </Button>
      )}
      {onDelete && (
        <Button variant="destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
      )}
      {onCancel && (
        <Button variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4" />
          Cancelar
        </Button>
      )}
      {onSave && (
        <Button onClick={onSave} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      )}
      {onNew && (
        <Button onClick={onNew}>
          <Plus className="h-4 w-4" />
          Novo
        </Button>
      )}
      {children}
    </div>
  );
}
