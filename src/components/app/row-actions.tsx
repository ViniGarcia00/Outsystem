"use client";

import { Copy, MoreHorizontal, Pencil, Power, PowerOff, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  onToggleAtivo: () => void;
  /** Registro está ativo? Define o rótulo Inativar/Reativar. */
  ativo: boolean;
  /** Opcional: quando fornecido, exibe a ação "Clonar" (ex.: Produtos). */
  onClone?: () => void;
}

/**
 * Ações padrão por linha das listagens: Editar, (Clonar), Inativar/Reativar e
 * Excluir. "Clonar" só aparece quando `onClone` é fornecido (opt-in por cadastro).
 */
export function RowActions({
  onEdit,
  onDelete,
  onToggleAtivo,
  ativo,
  onClone,
}: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Ações">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Editar
        </DropdownMenuItem>
        {onClone && (
          <DropdownMenuItem onClick={onClone}>
            <Copy className="h-4 w-4" />
            Clonar
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onToggleAtivo}>
          {ativo ? (
            <>
              <PowerOff className="h-4 w-4" />
              Inativar
            </>
          ) : (
            <>
              <Power className="h-4 w-4" />
              Reativar
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
