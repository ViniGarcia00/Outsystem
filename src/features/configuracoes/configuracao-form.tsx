"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { CrudFormShell } from "@/components/app";
import { FormSection, TextField, TextareaField } from "@/components/forms";
import type { ConfiguracaoValues } from "@/services/configuracao.service";

import { saveConfiguracaoAction } from "./actions";
import { configuracaoSchema, type ConfiguracaoFormValues } from "./schema";

export function ConfiguracaoForm({ initial }: { initial: ConfiguracaoValues }) {
  const [saving, setSaving] = useState(false);

  const form = useForm<ConfiguracaoFormValues>({
    resolver: zodResolver(configuracaoSchema),
    defaultValues: initial,
  });

  async function onSubmit(values: ConfiguracaoFormValues) {
    setSaving(true);
    const result = await saveConfiguracaoAction(values);
    setSaving(false);

    if (result.success) {
      form.reset(values); // limpa o estado "sujo" (singleton — permanece na tela)
      toast.success("Configuração salva com sucesso.");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <CrudFormShell
      title="Configuração do Sistema"
      description="Dados da empresa usados nas propostas e nos documentos."
      form={form}
      onSubmit={onSubmit}
      onCancel={() => form.reset(initial)}
      submitting={saving}
    >
      <FormSection title="Dados da empresa">
        <TextField name="nomeEmpresa" label="Nome da empresa" autoFocus />
        <TextField name="razaoSocial" label="Razão social" />
        <TextField name="cnpj" label="CNPJ" />
      </FormSection>

      <FormSection title="Endereço">
        <TextField name="cep" label="CEP" />
        <TextField name="endereco" label="Endereço" />
        <TextField name="numero" label="Número" />
        <TextField name="complemento" label="Complemento" />
        <TextField name="bairro" label="Bairro" />
        <TextField name="cidade" label="Cidade" />
        <TextField name="estado" label="Estado" />
      </FormSection>

      <FormSection title="Contatos">
        <TextField name="telefone" label="Telefone" />
        <TextField name="whatsapp" label="WhatsApp" />
        <TextField name="email" label="E-mail" type="email" />
        <TextField name="site" label="Site" />
      </FormSection>

      <FormSection title="Identidade visual">
        <TextField
          name="logo"
          label="Logo (URL)"
          placeholder="https://..."
          description="Nesta versão, informe a URL/caminho do logo (upload virá depois)."
        />
        <TextField name="corPrimaria" label="Cor primária" placeholder="#0F172A" />
        <TextField
          name="corSecundaria"
          label="Cor secundária"
          placeholder="#2563EB"
        />
      </FormSection>

      <FormSection title="Textos institucionais" cols={1}>
        <TextareaField
          name="textoQuemSomos"
          label="Texto “Quem Somos”"
          rows={4}
        />
        <TextareaField
          name="textoFinalProposta"
          label="Texto final da proposta"
          rows={4}
        />
      </FormSection>
    </CrudFormShell>
  );
}
