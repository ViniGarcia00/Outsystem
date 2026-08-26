"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { SelectField, TextareaField, TextField } from "@/components/forms";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RegistroDTO } from "@/services/instalacao-registro.service";
import { UsuarioSelectField } from "@/features/usuarios";
import type { UsuarioOption } from "@/services/usuario.service";

import { CustosEditor } from "./custos-editor";
import { dataHoraParaInput } from "./datas";
import { TIPO_REGISTRO_LABEL, TIPOS_REGISTRO_ORDER } from "./labels";
import { registroSchema, type RegistroValues } from "./registro-schema";

const TIPO_OPTIONS = TIPOS_REGISTRO_ORDER.map((value) => ({
  value,
  label: TIPO_REGISTRO_LABEL[value],
}));

/**
 * Criar/editar um acontecimento da cronologia (Sprint 4.0.2).
 *
 * Os custos vivem DENTRO do formulário (RHF), não em estado paralelo — fonte
 * única. Duas fontes seriam o caminho para um custo fantasma na edição, e um
 * `useState` extra exigiria `setState` dentro do efeito de reset, que o lint do
 * projeto barra.
 *
 * O reset é um `form.reset()` só, como em `cancelar-instalacao-dialog.tsx`.
 */
export function RegistroDialog({
  open,
  onOpenChange,
  registro,
  submitting,
  onConfirm,
  tecnicos,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registro: RegistroDTO | null;
  submitting: boolean;
  onConfirm: (values: RegistroValues) => void;
  tecnicos: UsuarioOption[];
}) {
  const form = useForm<RegistroValues>({
    resolver: zodResolver(registroSchema),
    defaultValues: {
      tipo: "VISITA_CLIENTE",
      aconteceuEm: "",
      tecnicoId: "",
      relatorio: "",
      custos: [],
    },
  });

  const custos = useWatch({ control: form.control, name: "custos" });

  useEffect(() => {
    if (!open) return;
    form.reset({
      tipo: registro?.tipo ?? "VISITA_CLIENTE",
      aconteceuEm: dataHoraParaInput(registro?.aconteceuEm ?? new Date()),
      tecnicoId: registro?.tecnicoId ?? "",
      relatorio: registro?.relatorio ?? "",
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
            Informe quando o fato aconteceu — pode ser anterior ao cadastro da
            instalação.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField name="tipo" label="Tipo" options={TIPO_OPTIONS} />
              <TextField
                name="aconteceuEm"
                label="Data e hora"
                type="datetime-local"
              />
            </div>
            <UsuarioSelectField
              name="tecnicoId"
              label="Responsável"
              options={tecnicos}
              placeholder="Selecione o técnico"
            />
            <TextareaField
              name="relatorio"
              label="Relatório"
              rows={6}
              placeholder="O que aconteceu, o que foi conversado, o que ficou decidido."
            />
            <CustosEditor
              custos={custos ?? []}
              onChange={(c) =>
                form.setValue("custos", c, { shouldDirty: true })
              }
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
