"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";

import { SelectField, TextareaField } from "@/components/forms";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";

import { MOTIVO_OPTIONS } from "./labels";
import { cancelarSchema, type CancelarFormValues } from "./schema";

interface CancelarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propostaLabel: string;
  submitting?: boolean;
  onConfirm: (values: CancelarFormValues) => Promise<void> | void;
}

/** Diálogo de cancelamento: motivo obrigatório; observação exigida em "Outro". */
export function CancelarDialog({
  open,
  onOpenChange,
  propostaLabel,
  submitting = false,
  onConfirm,
}: CancelarDialogProps) {
  const form = useForm<CancelarFormValues>({
    resolver: zodResolver(cancelarSchema),
    defaultValues: { motivo: "CLIENTE_DESISTIU", obs: "" },
  });

  // Reseta ao abrir.
  useEffect(() => {
    if (open) form.reset({ motivo: "CLIENTE_DESISTIU", obs: "" });
  }, [open, form]);

  const motivo = useWatch({ control: form.control, name: "motivo" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar {propostaLabel}?</DialogTitle>
          <DialogDescription>
            O cancelamento é definitivo — a proposta permanece registrada, mas não
            poderá mais ser editada.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="cancelar-form"
            onSubmit={form.handleSubmit(onConfirm)}
            className="flex flex-col gap-4"
          >
            <SelectField
              name="motivo"
              label="Motivo do cancelamento"
              options={MOTIVO_OPTIONS}
            />
            {motivo === "OUTRO" && (
              <TextareaField
                name="obs"
                label="Observação"
                description="Obrigatória para o motivo Outro."
                rows={3}
              />
            )}
          </form>
        </Form>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Voltar
          </Button>
          <Button
            type="submit"
            form="cancelar-form"
            variant="destructive"
            disabled={submitting}
          >
            {submitting ? "Cancelando..." : "Cancelar proposta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
