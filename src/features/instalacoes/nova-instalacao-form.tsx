"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CrudFormShell } from "@/components/app";
import {
  FormSection,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/forms";
import { ClienteAutocomplete } from "@/features/propostas/cliente-autocomplete";
import { UsuarioSelectField } from "@/features/usuarios";
import type { UsuarioOption } from "@/services/usuario.service";

import { criarInstalacaoAction, enderecoDoClienteAction } from "./actions";
import type { EnderecoInstalacao } from "./endereco";
import { EnderecoSnapshot } from "./endereco-snapshot";
import { STATUS_LABEL, STATUS_ORDER } from "./labels";
import { PropostaAutocomplete } from "./proposta-autocomplete";
import { novaInstalacaoSchema, type NovaInstalacaoValues } from "./schema";

const STATUS_OPTIONS = STATUS_ORDER.filter((s) => s !== "CANCELADA").map(
  (value) => ({ value, label: STATUS_LABEL[value] }),
);

const NOTA_ENDERECO =
  "Endereço copiado do cadastro do cliente no momento da criação. " +
  "Para alterá-lo, edite o cadastro do cliente antes de criar a instalação.";

/**
 * Criação de Instalação (Sprint 4.0.1).
 *
 * O endereço NÃO faz parte do formulário: é estado local, exibido apenas para o
 * usuário conferir o que será gravado. O snapshot real é derivado no service, a
 * partir do Cliente persistido (ADR-0400).
 */
export function NovaInstalacaoForm({ tecnicos }: { tecnicos: UsuarioOption[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [clienteLabel, setClienteLabel] = useState<string | null>(null);
  const [propostaLabel, setPropostaLabel] = useState<string | null>(null);
  const [enderecoPreview, setEnderecoPreview] =
    useState<EnderecoInstalacao | null>(null);

  const form = useForm<NovaInstalacaoValues>({
    resolver: zodResolver(novaInstalacaoSchema),
    defaultValues: {
      clienteId: "",
      propostaId: null,
      tecnicoResponsavelId: null,
      status: "A_AGENDAR",
      dataPrevista: "",
      dataAgendada: "",
      periodo: "",
      observacoes: "",
    },
  });

  // useWatch em vez de form.watch(): watch() devolve função não-memoizável e o
  // React Compiler pula a memoização do componente inteiro.
  const clienteIdAtual = useWatch({ control: form.control, name: "clienteId" });
  const propostaIdAtual = useWatch({
    control: form.control,
    name: "propostaId",
  });

  const handleCliente = async (
    cliente: { id: string; label: string } | null,
  ) => {
    form.setValue("clienteId", cliente?.id ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    setClienteLabel(cliente?.label ?? null);
    // PRÉ-VISUALIZAÇÃO apenas. O que será gravado é derivado no service, a
    // partir do Cliente persistido — nada daqui é enviado ao servidor.
    setEnderecoPreview(
      cliente ? await enderecoDoClienteAction(cliente.id) : null,
    );
  };

  async function onSubmit(values: NovaInstalacaoValues) {
    setSaving(true);
    const result = await criarInstalacaoAction(values);

    if (result.success) {
      form.reset(values); // limpa o "dirty" antes de navegar (evita o guard)
      toast.success(`Instalação ${result.data.numero} criada.`);
      router.push(`/instalacoes/${result.data.id}`);
    } else {
      setSaving(false);
      toast.error(result.error);
    }
  }

  return (
    <FormProvider {...form}>
      <CrudFormShell
        title="Nova instalação"
        description="Cadastro manual de instalação."
        form={form}
        onSubmit={onSubmit}
        onCancel={() => router.push("/instalacoes")}
        submitting={saving}
      >
        <FormSection title="Dados da instalação">
          <ClienteAutocomplete
            value={clienteIdAtual || null}
            initialLabel={clienteLabel}
            onSelect={handleCliente}
            autoFocus
          />
          <PropostaAutocomplete
            value={propostaIdAtual}
            initialLabel={propostaLabel}
            onSelect={(p) => {
              form.setValue("propostaId", p?.id ?? null, { shouldDirty: true });
              setPropostaLabel(p?.label ?? null);
            }}
          />
          <UsuarioSelectField
            name="tecnicoResponsavelId"
            label="Responsável atual"
            options={tecnicos}
            placeholder="Selecione o técnico"
            opcional
          />
          <SelectField name="status" label="Status" options={STATUS_OPTIONS} />
        </FormSection>

        <EnderecoSnapshot endereco={enderecoPreview} nota={NOTA_ENDERECO} />

        {/* Trio de campos curtos: `cols={3}` evita "Período" órfão em meia
            linha no desktop — mesmo arranjo do workspace da instalação. */}
        <FormSection title="Programação" cols={3}>
          <TextField name="dataPrevista" label="Data prevista" type="date" />
          <TextField name="dataAgendada" label="Data agendada" type="date" />
          <TextField
            name="periodo"
            label="Período"
            placeholder="Ex.: manhã, 14h às 17h"
          />
        </FormSection>

        <FormSection title="Observações" cols={1}>
          <TextareaField name="observacoes" label="Observações gerais" rows={4} />
        </FormSection>
      </CrudFormShell>
    </FormProvider>
  );
}
