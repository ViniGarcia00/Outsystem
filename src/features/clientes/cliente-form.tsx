"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CrudFormShell } from "@/components/app";
import {
  FormSection,
  MaskedField,
  SelectField,
  SwitchField,
  TextField,
  TextareaField,
} from "@/components/forms";
import { UF_OPTIONS } from "@/lib/ufs";
import { formatCpfCnpj, formatPhone } from "@/utils";

import { createClienteAction, updateClienteAction } from "./actions";
import { clienteSchema, type ClienteFormValues } from "./schema";

interface ClienteFormProps {
  /** Presente no modo edição. */
  clienteId?: string;
  defaultValues: ClienteFormValues;
}

export function ClienteForm({ clienteId, defaultValues }: ClienteFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(clienteId);

  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues,
  });

  const tipoPessoa = useWatch({ control: form.control, name: "tipoPessoa" });

  async function onSubmit(values: ClienteFormValues) {
    setSaving(true);
    const result = clienteId
      ? await updateClienteAction(clienteId, values)
      : await createClienteAction(values);

    if (result.success) {
      form.reset(values); // limpa o "dirty" antes de navegar (evita o guard)
      toast.success(isEdit ? "Cliente atualizado." : "Cliente criado.");
      router.push("/clientes");
    } else {
      setSaving(false);
      toast.error(result.error);
    }
  }

  return (
    <CrudFormShell
      title={isEdit ? "Editar cliente" : "Novo cliente"}
      description="Preencha os dados do cliente."
      form={form}
      onSubmit={onSubmit}
      onCancel={() => router.push("/clientes")}
      submitting={saving}
    >
      <FormSection title="Identificação">
        <SelectField
          name="tipoPessoa"
          label="Tipo de pessoa"
          options={[
            { value: "PF", label: "Pessoa Física" },
            { value: "PJ", label: "Pessoa Jurídica" },
          ]}
        />
        {tipoPessoa === "PJ" ? (
          <TextField name="empresa" label="Empresa" autoFocus />
        ) : (
          <TextField name="nome" label="Nome" autoFocus />
        )}
        <MaskedField
          name="cpfCnpj"
          label="CPF / CNPJ"
          inputMode="numeric"
          format={formatCpfCnpj}
          placeholder="Opcional"
        />
        {/* Documento secundário opcional: RG (PF) ou Inscrição Estadual (PJ). */}
        {tipoPessoa === "PJ" ? (
          <TextField
            name="inscricaoEstadual"
            label="Inscrição Estadual"
            placeholder="Opcional"
          />
        ) : (
          <TextField name="rg" label="RG" placeholder="Opcional" />
        )}
        <SwitchField
          name="ativo"
          label="Ativo"
          description="Clientes inativos ficam ocultos por padrão."
        />
      </FormSection>

      <FormSection title="Endereço">
        <TextField name="cep" label="CEP" />
        <TextField name="endereco" label="Endereço" />
        <TextField name="numero" label="Número" />
        <TextField name="complemento" label="Complemento" />
        <TextField name="bairro" label="Bairro" />
        <TextField name="cidade" label="Cidade" />
        <SelectField
          name="estado"
          label="UF"
          options={UF_OPTIONS}
          placeholder="UF"
        />
      </FormSection>

      <FormSection title="Contato">
        <MaskedField
          name="telefone"
          label="Telefone"
          inputMode="numeric"
          format={formatPhone}
        />
        <TextField name="email" label="E-mail" type="email" />
      </FormSection>

      <FormSection title="Observações" cols={1}>
        <TextareaField name="observacoes" label="Observações" rows={4} />
      </FormSection>
    </CrudFormShell>
  );
}
