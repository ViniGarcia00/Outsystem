"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { CrudFormShell } from "@/components/app";
import {
  CurrencyField,
  FormSection,
  SwitchField,
  TextField,
} from "@/components/forms";

import { createProdutoAction, updateProdutoAction } from "./actions";
import { produtoSchema, type ProdutoFormValues } from "./schema";

interface ProdutoFormProps {
  produtoId?: string;
  defaultValues: ProdutoFormValues;
}

export function ProdutoForm({ produtoId, defaultValues }: ProdutoFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(produtoId);

  const form = useForm<ProdutoFormValues>({
    resolver: zodResolver(produtoSchema),
    defaultValues,
  });

  async function onSubmit(values: ProdutoFormValues) {
    setSaving(true);
    const result = produtoId
      ? await updateProdutoAction(produtoId, values)
      : await createProdutoAction(values);

    if (result.success) {
      form.reset(values);
      toast.success(isEdit ? "Produto atualizado." : "Produto criado.");
      router.push("/produtos");
    } else {
      setSaving(false);
      toast.error(result.error);
    }
  }

  return (
    <CrudFormShell
      title={isEdit ? "Editar produto" : "Novo produto"}
      description="Preencha os dados do produto."
      form={form}
      onSubmit={onSubmit}
      onCancel={() => router.push("/produtos")}
      submitting={saving}
    >
      <FormSection title="Dados do produto">
        <TextField name="codigo" label="Código" autoFocus />
        <TextField name="descricao" label="Descrição" />
        <CurrencyField name="valorProduto" label="Valor do produto" />
        <CurrencyField
          name="valorServico"
          label="Valor do serviço"
          description="Pode ser zero."
        />
        <SwitchField
          name="ativo"
          label="Ativo"
          description="Produtos inativos ficam ocultos por padrão."
        />
      </FormSection>
    </CrudFormShell>
  );
}
