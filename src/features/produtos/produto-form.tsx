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
  MaskedField,
  SwitchField,
  TextField,
} from "@/components/forms";

/** Código sempre em MAIÚSCULO (unicidade case-insensitive). */
const upper = (value: string) => value.toUpperCase();

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
        <MaskedField
          name="codigo"
          label="Código"
          format={upper}
          autoFocus
        />
        <TextField name="descricao" label="Descrição" />
        <MaskedField
          name="unidade"
          label="Unidade"
          format={upper}
          placeholder="UN, MT, CX, RL..."
        />
        <CurrencyField name="valorProduto" label="Valor do produto" />
        <CurrencyField
          name="valorServico"
          label="Valor do serviço (pode ser zero)"
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
