"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { TextField, TextareaField } from "@/components/forms";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UsuarioSelectField } from "@/features/usuarios";
import type { UsuarioOption } from "@/services/usuario.service";

import { dataHoraParaInput } from "@/features/instalacoes/datas";

import { CustosEditorPosVenda } from "./custos-editor";
import type { CategoriaCustoPosVenda } from "./labels";
import {
  registroPosVendaSchema,
  type RegistroPosVendaValues,
} from "./registro-schema";
import type { RegistroPosVendaDTO } from "./tipos";

/**
 * Criar/editar um acontecimento da timeline — o MESMO diálogo para Troca e OS
 * (Sprint 4.6).
 *
 * Os custos vivem DENTRO do formulário (RHF), não em estado paralelo — fonte
 * única. Duas fontes seriam o caminho para um custo fantasma na edição, e um
 * `useState` extra exigiria `setState` dentro do efeito de reset, que o lint do
 * projeto barra. Mesma decisão de `features/instalacoes/registro-dialog.tsx`.
 *
 * Não há campo "tipo" de registro, ao contrário da cronologia de Instalações: o
 * Pós-venda não pediu taxonomia de acontecimento, e inventar uma seria decidir
 * produto por conta própria.
 */
export function RegistroPosVendaDialog({
  open,
  onOpenChange,
  registro,
  submitting,
  onConfirm,
  responsaveis,
  categorias,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registro: RegistroPosVendaDTO | null;
  submitting: boolean;
  onConfirm: (values: RegistroPosVendaValues) => void;
  responsaveis: UsuarioOption[];
  /** Categorias que ESTE submódulo oferece (envio na Troca, reparo na OS). */
  categorias: CategoriaCustoPosVenda[];
}) {
  const form = useForm<RegistroPosVendaValues>({
    resolver: zodResolver(registroPosVendaSchema),
    defaultValues: {
      dataHora: "",
      responsavelId: "",
      relato: "",
      custos: [],
    },
  });

  const custos = useWatch({ control: form.control, name: "custos" });

  useEffect(() => {
    if (!open) return;
    form.reset({
      dataHora: dataHoraParaInput(registro?.dataHora ?? new Date()),
      responsavelId: registro?.responsavelId ?? "",
      relato: registro?.relato ?? "",
      custos:
        registro?.custos.map((c) => ({
          categoria: c.categoria,
          descricao: c.descricao ?? "",
          valor: c.valor,
        })) ?? [],
    });
  }, [open, registro, form]);

  const submeter = form.handleSubmit(onConfirm);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {registro ? "Editar registro" : "Novo registro"}
          </DialogTitle>
          <DialogDescription>
            Informe quando o fato aconteceu — pode ser anterior à abertura do
            processo.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                name="dataHora"
                label="Data e hora"
                type="datetime-local"
              />
              <UsuarioSelectField
                name="responsavelId"
                label="Responsável"
                options={responsaveis}
                placeholder="Selecione o responsável"
              />
            </div>
            <TextareaField
              name="relato"
              label="Relato"
              rows={6}
              placeholder="O que aconteceu, o que foi combinado, o que ficou decidido."
            />
            <CustosEditorPosVenda
              custos={custos ?? []}
              categorias={categorias}
              onChange={(c) => form.setValue("custos", c, { shouldDirty: true })}
            />
          </div>
        </FormProvider>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={submeter} disabled={submitting}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
