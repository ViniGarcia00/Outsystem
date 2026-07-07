"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { CrudFormShell } from "@/components/app";
import {
  FormSection,
  MaskedField,
  SwitchField,
  TextField,
} from "@/components/forms";
import { formatPhone } from "@/utils";

import { createVendedorAction, updateVendedorAction } from "./actions";
import { vendedorSchema, type VendedorFormValues } from "./schema";

interface VendedorFormProps {
  vendedorId?: string;
  defaultValues: VendedorFormValues;
}

export function VendedorForm({ vendedorId, defaultValues }: VendedorFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(vendedorId);

  const form = useForm<VendedorFormValues>({
    resolver: zodResolver(vendedorSchema),
    defaultValues,
  });

  async function onSubmit(values: VendedorFormValues) {
    setSaving(true);
    const result = vendedorId
      ? await updateVendedorAction(vendedorId, values)
      : await createVendedorAction(values);

    if (result.success) {
      form.reset(values);
      toast.success(isEdit ? "Vendedor atualizado." : "Vendedor criado.");
      router.push("/vendedores");
    } else {
      setSaving(false);
      toast.error(result.error);
    }
  }

  return (
    <CrudFormShell
      title={isEdit ? "Editar vendedor" : "Novo vendedor"}
      description="Preencha os dados do vendedor."
      form={form}
      onSubmit={onSubmit}
      onCancel={() => router.push("/vendedores")}
      submitting={saving}
    >
      <FormSection title="Dados do vendedor">
        <TextField name="nome" label="Nome" autoFocus />
        <MaskedField
          name="telefone"
          label="Telefone"
          inputMode="numeric"
          format={formatPhone}
        />
        <TextField name="email" label="E-mail" type="email" />
        <SwitchField
          name="ativo"
          label="Ativo"
          description="Vendedores inativos ficam ocultos por padrão."
        />
      </FormSection>
    </CrudFormShell>
  );
}
