"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { CrudFormShell } from "@/components/app";
import { FormSection, SwitchField, TextField } from "@/components/forms";

import { createTecnicoAction, updateTecnicoAction } from "./actions";
import { tecnicoSchema, type TecnicoFormValues } from "./schema";

interface TecnicoFormProps {
  tecnicoId?: string;
  defaultValues: TecnicoFormValues;
}

/** Cadastro de Técnico — dois campos (ADR-0408). Molde de `vendedor-form.tsx`. */
export function TecnicoForm({ tecnicoId, defaultValues }: TecnicoFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(tecnicoId);

  const form = useForm<TecnicoFormValues>({
    resolver: zodResolver(tecnicoSchema),
    defaultValues,
  });

  async function onSubmit(values: TecnicoFormValues) {
    setSaving(true);
    const result = tecnicoId
      ? await updateTecnicoAction(tecnicoId, values)
      : await createTecnicoAction(values);

    if (result.success) {
      form.reset(values);
      toast.success(isEdit ? "Técnico atualizado." : "Técnico criado.");
      router.push("/tecnicos");
    } else {
      setSaving(false);
      toast.error(result.error);
    }
  }

  return (
    <CrudFormShell
      title={isEdit ? "Editar técnico" : "Novo técnico"}
      description="Preencha os dados do técnico."
      form={form}
      onSubmit={onSubmit}
      onCancel={() => router.push("/tecnicos")}
      submitting={saving}
    >
      <FormSection title="Dados do técnico">
        <TextField name="nome" label="Nome" autoFocus />
        <SwitchField
          name="ativo"
          label="Ativo"
          description="Técnicos inativos ficam ocultos por padrão e não aparecem como opção em novos vínculos."
        />
      </FormSection>
    </CrudFormShell>
  );
}
