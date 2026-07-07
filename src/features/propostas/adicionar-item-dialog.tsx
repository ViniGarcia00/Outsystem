"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { NumberField, SelectField } from "@/components/forms";
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

import { adicionarItemAction } from "./conteudo-actions";

const schema = z.object({
  produtoId: z.string().min(1, "Selecione um produto."),
  quantidade: z
    .number({ message: "Informe a quantidade." })
    .positive("A quantidade deve ser maior que zero."),
});
type Values = z.infer<typeof schema>;

interface Option {
  value: string;
  label: string;
}

interface AdicionarItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  secaoId: string;
  secaoNome: string;
  produtos: Option[];
  onAdded: () => void;
}

export function AdicionarItemDialog({
  open,
  onOpenChange,
  secaoId,
  secaoNome,
  produtos,
  onAdded,
}: AdicionarItemDialogProps) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { produtoId: "", quantidade: 1 },
  });

  useEffect(() => {
    if (open) form.reset({ produtoId: "", quantidade: 1 });
  }, [open, form]);

  async function onSubmit(values: Values) {
    const result = await adicionarItemAction(
      secaoId,
      values.produtoId,
      values.quantidade,
    );
    if (result.success) {
      toast.success("Produto adicionado.");
      onOpenChange(false);
      onAdded();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar produto</DialogTitle>
          <DialogDescription>Seção: {secaoNome}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="adicionar-item-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <SelectField
              name="produtoId"
              label="Produto"
              options={produtos}
              placeholder="Selecione o produto"
            />
            <NumberField
              name="quantidade"
              label="Quantidade"
              min={0.001}
              step="any"
            />
          </form>
        </Form>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" form="adicionar-item-form">
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
