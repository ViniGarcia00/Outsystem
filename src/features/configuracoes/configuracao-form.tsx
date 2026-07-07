"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type ChangeEvent, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CrudFormShell } from "@/components/app";
import { FormSection, MaskedField, TextField } from "@/components/forms";
import type { ConfiguracaoValues } from "@/services/configuracao.service";
import { formatPhone } from "@/utils";

import { saveConfiguracaoAction, uploadLogoAction } from "./actions";
import { configuracaoSchema, type ConfiguracaoFormValues } from "./schema";

/** Tipos aceitos no upload do logo (PNG/JPG — compatíveis com o PDF). */
const LOGO_ACCEPT = "image/png,image/jpeg";

export function ConfiguracaoForm({ initial }: { initial: ConfiguracaoValues }) {
  const [saving, setSaving] = useState(false);

  const form = useForm<ConfiguracaoFormValues>({
    resolver: zodResolver(configuracaoSchema),
    defaultValues: initial,
  });

  const [uploadingLogo, setUploadingLogo] = useState(false);
  // Cache-busting do preview após um novo upload (a rota do logo é no-store).
  const [logoVersion, setLogoVersion] = useState(0);
  const logo = useWatch({ control: form.control, name: "logo" });

  async function onLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite reenviar o mesmo arquivo
    if (!file) return;
    setUploadingLogo(true);
    const data = new FormData();
    data.append("file", file);
    const result = await uploadLogoAction(data);
    setUploadingLogo(false);
    if (result.success) {
      // Mantém o nome no formulário (o Salvar não apaga o logo) e atualiza o preview.
      form.setValue("logo", result.data.logo, { shouldDirty: false });
      setLogoVersion((v) => v + 1);
      toast.success("Logotipo enviado.");
    } else {
      toast.error(result.error);
    }
  }

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
        <MaskedField
          name="telefone"
          label="Telefone"
          inputMode="numeric"
          format={formatPhone}
        />
        <MaskedField
          name="whatsapp"
          label="WhatsApp"
          inputMode="numeric"
          format={formatPhone}
        />
        <TextField name="email" label="E-mail" type="email" />
        <TextField name="site" label="Site" />
      </FormSection>

      <FormSection title="Identidade visual" cols={1}>
        <div className="space-y-3">
          <p className="text-sm font-medium">Logotipo</p>
          <div className="flex items-center gap-4">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/configuracoes/logo?v=${logoVersion}`}
                alt="Logotipo da empresa"
                className="h-16 w-auto max-w-[220px] rounded border bg-white object-contain p-1"
              />
            ) : (
              <div className="flex h-16 w-28 items-center justify-center rounded border border-dashed text-xs text-muted-foreground">
                Sem logo
              </div>
            )}
            <div className="space-y-1">
              <input
                type="file"
                accept={LOGO_ACCEPT}
                disabled={uploadingLogo}
                onChange={onLogoChange}
                aria-label="Enviar logotipo"
                className="block text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                PNG ou JPG, até 2 MB. Enviado por upload (sem links externos) e
                usado no PDF e nos documentos.
              </p>
            </div>
          </div>
        </div>
      </FormSection>
    </CrudFormShell>
  );
}
