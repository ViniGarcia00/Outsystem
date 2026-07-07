"use client";

import { memo } from "react";

import { Badge } from "@/components/ui/badge";

/**
 * Selo de status padrão dos cadastros (Ativo / Inativo).
 * Padrão de cores oficial: Ativo = verde, Inativo = vermelho (ADR-0159).
 */
function StatusBadgeBase({ ativo }: { ativo: boolean }) {
  return ativo ? (
    <Badge variant="success">Ativo</Badge>
  ) : (
    <Badge variant="danger">Inativo</Badge>
  );
}

export const StatusBadge = memo(StatusBadgeBase);
