"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { TextareaField } from "@/components/forms";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  cancelarInstalacaoSchema,
  type CancelarInstalacaoValues,
} from "./schema";

/**
 * Confirmação de cancelamento da Instalação (Sprint 4.0.1).
 *
 * Cancelar NÃO exclui: a instalação continua na listagem, sob o filtro
 * "Cancelada", com todo o histórico preservado (ADR-0400). O motivo é opcional
 * e vai para a auditoria técnica.
 */
export function CancelarInstalacaoDialog({
  open,
  onOpenChange,
  instalacaoLabel,
  submitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instalacaoLabel: string;
  submitting: boolean;
  onConfirm: (motivo: string) => void;
}) {
  const form = useForm<CancelarInstalacaoValues>({
    resolver: zodResolver(cancelarInstalacaoSchema),
    defaultValues: { motivo: "" },
  });

  // Limpa a cada abertura para não vazar o motivo de outra instalação.
  useEffect(() => {
    if (open) form.reset({ motivo: "" });
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar {instalacaoLabel}</DialogTitle>
          <DialogDescription>
            A instalação será marcada como Cancelada. O histórico é preservado e
            ela continua acessível pelo filtro de status.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <TextareaField
            name="motivo"
            label="Motivo (opcional)"
            rows={3}
            placeholder="Ex.: cliente adiou a obra por tempo indeterminado."
          />
        </FormProvider>

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
            variant="destructive"
            onClick={form.handleSubmit((v) => onConfirm(v.motivo))}
            disabled={submitting}
          >
            Cancelar instalação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
