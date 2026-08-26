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

import { createUsuarioAction, updateUsuarioAction } from "./actions";
import { usuarioSchema, type UsuarioFormValues } from "./schema";

interface UsuarioFormProps {
  usuarioId?: string;
  defaultValues: UsuarioFormValues;
}

/**
 * Cadastro de Usuário (ADR-0410) — molde de `vendedor-form.tsx`, com a seção de
 * papéis a mais. Substitui os formulários de Vendedor e Técnico.
 */
export function UsuarioForm({ usuarioId, defaultValues }: UsuarioFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(usuarioId);

  const form = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioSchema),
    defaultValues,
  });

  async function onSubmit(values: UsuarioFormValues) {
    setSaving(true);
    const result = usuarioId
      ? await updateUsuarioAction(usuarioId, values)
      : await createUsuarioAction(values);

    if (result.success) {
      form.reset(values);
      toast.success(isEdit ? "Usuário atualizado." : "Usuário criado.");
      router.push("/usuarios");
    } else {
      setSaving(false);
      toast.error(result.error);
    }
  }

  return (
    <CrudFormShell
      title={isEdit ? "Editar usuário" : "Novo usuário"}
      description="Preencha os dados do usuário."
      form={form}
      onSubmit={onSubmit}
      onCancel={() => router.push("/usuarios")}
      submitting={saving}
    >
      <FormSection title="Dados do usuário">
        <TextField name="nome" label="Nome" autoFocus />
        <MaskedField
          name="telefone"
          label="Telefone"
          inputMode="numeric"
          format={formatPhone}
        />
        <TextField name="email" label="E-mail" type="email" />
      </FormSection>

      <FormSection title="Papéis">
        {/* Independentes: a mesma pessoa pode ser as duas coisas, uma só, ou
            nenhuma (ADR-0410). Sem papel, não aparece em select nenhum — é o
            cadastro criado antes de a função ser decidida. */}
        <SwitchField
          name="ehVendedor"
          label="Vendedor"
          description="Aparece como opção de Vendedor nas Propostas."
        />
        <SwitchField
          name="ehTecnico"
          label="Técnico"
          description="Aparece como opção de Técnico nas Instalações e na cronologia."
        />
        <SwitchField
          name="ativo"
          label="Ativo"
          description="Usuários inativos ficam ocultos por padrão e não aparecem como opção em novos vínculos."
        />
      </FormSection>
    </CrudFormShell>
  );
}
