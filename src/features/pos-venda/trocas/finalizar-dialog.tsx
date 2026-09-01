"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PendenciaRetorno } from "@/features/pos-venda/tipos";

/**
 * Confirmação forte da finalização da Troca (spec §12).
 *
 * ── POR QUE ENUMERAR AS PENDÊNCIAS ──────────────────────────────────────────
 * Um "tem certeza?" genérico não é confirmação forte — é um clique a mais. O
 * que torna a decisão informada é ver, item a item, **o que exatamente** não
 * voltou. Quem finaliza uma troca com 2 de 7 interruptores faltando precisa
 * estar afirmando isso, não descobrindo depois.
 *
 * ── POR QUE NÃO É BLOQUEIO ──────────────────────────────────────────────────
 * Produto perdido, acordo comercial, cobrança futura e decisão administrativa
 * são desfechos reais. Bloquear empurraria o usuário a lançar uma devolução que
 * não houve — trocar um registro honesto de pendência por um dado falso. Por
 * isso o botão de confirmar existe, e é destrutivo apenas na aparência.
 *
 * Sem pendência, o diálogo vira uma confirmação simples: o mesmo componente
 * cobre os dois casos, e a diferença é visível na tela.
 */
export function FinalizarTrocaDialog({
  open,
  onOpenChange,
  pendencias,
  submitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendencias: PendenciaRetorno[];
  submitting: boolean;
  onConfirm: () => void;
}) {
  const temPendencia = pendencias.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finalizar troca antecipada</DialogTitle>
          <DialogDescription>
            {temPendencia
              ? "Ainda há produtos pendentes de devolução. A troca será finalizada mesmo assim."
              : "Todos os produtos esperados foram devolvidos. A troca será finalizada."}
          </DialogDescription>
        </DialogHeader>

        {temPendencia && (
          <div
            className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-500/40 dark:bg-amber-500/10"
            data-testid="pendencias-finalizacao"
          >
            <p className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Pendências de devolução
            </p>
            <ul className="space-y-1">
              {pendencias.map((p, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span className="min-w-0 break-words">{p.descricao}</span>
                  <span className="shrink-0 tabular-nums">
                    {p.devolvido}/{p.esperado} · faltam {p.pendente}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground">
              Finalize apenas se houver uma decisão registrada — perda, acordo ou
              cobrança. O histórico da troca continua acessível.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Voltar
          </Button>
          <Button
            type="button"
            variant={temPendencia ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={submitting}
          >
            {temPendencia ? "Finalizar mesmo assim" : "Finalizar troca"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
