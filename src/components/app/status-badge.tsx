"use client";

import { memo } from "react";

import { Badge } from "@/components/ui/badge";

/** Selo de status padrão dos cadastros (Ativo / Inativo). */
function StatusBadgeBase({ ativo }: { ativo: boolean }) {
  return ativo ? (
    <Badge variant="secondary">Ativo</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      Inativo
    </Badge>
  );
}

export const StatusBadge = memo(StatusBadgeBase);
