"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CrudFormShell } from "@/components/app";
import {
  CurrencyField,
  FormSection,
  MaskedField,
  SwitchField,
  TextField,
} from "@/components/forms";

/** SKU sempre em MAIÚSCULO (unicidade case-insensitive). */
const upper = (value: string) => value.toUpperCase();

/** Mensagem única de SKU duplicado (frontend + backend). */
const SKU_DUPLICADO =
  "Este SKU já está sendo utilizado por outro produto. Informe um SKU diferente.";

import {
  createProdutoAction,
  updateProdutoAction,
  verificarSkuAction,
} from "./actions";
import { produtoSchema, type ProdutoFormValues } from "./schema";

interface ProdutoFormProps {
  produtoId?: string;
  defaultValues: ProdutoFormValues;
  /** Aberto via clonagem (`?clonarDe=`): exibe o lembrete de novo SKU. */
  clonado?: boolean;
}

export function ProdutoForm({
  produtoId,
  defaultValues,
  clonado = false,
}: ProdutoFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(produtoId);

  const form = useForm<ProdutoFormValues>({
    resolver: zodResolver(produtoSchema),
    defaultValues,
  });

  // Task 3 (1º nível) — validação de SKU único em tempo real (debounce). O
  // backend e o índice único do banco garantem a unicidade; aqui é só feedback.
  const codigo = useWatch({ control: form.control, name: "codigo" });
  useEffect(() => {
    const valor = codigo?.trim();
    if (!valor) return;
    let ativo = true;
    const timer = setTimeout(async () => {
      const disponivel = await verificarSkuAction(valor, produtoId);
      if (!ativo) return;
      if (!disponivel) {
        form.setError("codigo", { type: "manual", message: SKU_DUPLICADO });
      } else if (form.getFieldState("codigo").error?.type === "manual") {
        form.clearErrors("codigo");
      }
    }, 400);
    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [codigo, produtoId, form]);

  async function onSubmit(values: ProdutoFormValues) {
    setSaving(true);

    // Task 3 (2º nível, guarda no envio) — revalida o SKU antes de persistir.
    const disponivel = await verificarSkuAction(values.codigo, produtoId);
    if (!disponivel) {
      form.setError("codigo", { type: "manual", message: SKU_DUPLICADO });
      toast.error(SKU_DUPLICADO);
      setSaving(false);
      return;
    }

    const result = produtoId
      ? await updateProdutoAction(produtoId, values)
      : await createProdutoAction(values);

    if (result.success) {
      form.reset(values);
      // Task 6 — sinaliza o item recém-editado para o destaque na listagem.
      if (produtoId && typeof window !== "undefined") {
        sessionStorage.setItem("crudlist:produtos:highlight", produtoId);
      }
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
      {clonado && (
        <div className="flex items-center gap-2 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
          <Info className="h-4 w-4 shrink-0" />
          Produto clonado. Informe um novo SKU antes de salvar.
        </div>
      )}

      <FormSection title="Dados do produto">
        <MaskedField
          name="codigo"
          label="SKU"
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
