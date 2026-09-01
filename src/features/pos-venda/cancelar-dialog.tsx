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
  cancelarPosVendaSchema,
  type CancelarPosVendaValues,
} from "./registro-schema";

/**
 * Confirmação de cancelamento — Troca ou OS (Sprint 4.6).
 *
 * Cancelar NÃO exclui: o processo continua na listagem, sob o filtro
 * "Cancelada", com timeline, custos e anexos preservados (spec §42, mesma
 * regra do ADR-0203 e do ADR-0400). O motivo é opcional e vai para a trilha de
 * auditoria.
 */
export function CancelarPosVendaDialog({
  open,
  onOpenChange,
  titulo,
  rotuloAcao,
  submitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ex.: "Cancelar Troca 1001". */
  titulo: string;
  /** Texto do botão destrutivo. Ex.: "Cancelar troca". */
  rotuloAcao: string;
  submitting: boolean;
  onConfirm: (motivo: string) => void;
}) {
  const form = useForm<CancelarPosVendaValues>({
    resolver: zodResolver(cancelarPosVendaSchema),
    defaultValues: { motivo: "" },
  });

  // Limpa a cada abertura para não vazar o motivo de outro processo.
  useEffect(() => {
    if (open) form.reset({ motivo: "" });
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            O processo será marcado como Cancelado. O histórico é preservado e
            ele continua acessível pelo filtro de status.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <TextareaField
            name="motivo"
            label="Motivo (opcional)"
            rows={3}
            placeholder="Ex.: cliente desistiu da substituição."
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
            {rotuloAcao}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
