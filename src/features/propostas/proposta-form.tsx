"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { CrudFormShell } from "@/components/app";
import {
  FormSection,
  NumberField,
  SelectField,
  TextareaField,
} from "@/components/forms";
import { Badge } from "@/components/ui/badge";
import type { StatusProposta } from "@/services/proposta.service";

import { createPropostaAction, updatePropostaAction } from "./actions";
import { ClienteAutocompleteField } from "./cliente-autocomplete";
import {
  MODELO_OPTIONS,
  STATUS_BADGE_VARIANT,
  STATUS_LABEL,
  statusOptionsFor,
} from "./labels";
import { propostaSchema, type PropostaFormValues } from "./schema";

interface Option {
  value: string;
  label: string;
}

interface PropostaFormProps {
  propostaId?: string;
  defaultValues: PropostaFormValues;
  vendedores: Option[];
  proposalNumber?: number;
  revisaoAtual?: number | null;
  currentStatus?: StatusProposta;
  clienteNome?: string;
  /** Preenchido quando cancelada (readOnly). */
  cancelInfo?: { motivoLabel: string; obs: string };
  readOnly?: boolean;
}

export function PropostaForm({
  propostaId,
  defaultValues,
  vendedores,
  proposalNumber,
  revisaoAtual,
  currentStatus,
  clienteNome,
  cancelInfo,
  readOnly = false,
}: PropostaFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(propostaId);

  const form = useForm<PropostaFormValues>({
    resolver: zodResolver(propostaSchema),
    defaultValues,
  });

  async function onSubmit(values: PropostaFormValues) {
    setSaving(true);
    if (propostaId) {
      const result = await updatePropostaAction(propostaId, values);
      if (result.success) {
        form.reset(values);
        toast.success("Proposta atualizada.");
        router.push(`/propostas/${propostaId}`); // volta ao workspace
      } else {
        setSaving(false);
        toast.error(result.error);
      }
    } else {
      const result = await createPropostaAction(values);
      if (result.success) {
        form.reset(values);
        toast.success("Proposta criada.");
        router.push(`/propostas/${result.data.id}`); // abre o workspace
      } else {
        setSaving(false);
        toast.error(result.error);
      }
    }
  }

  const title = isEdit
    ? `Proposta ${proposalNumber} · Rev.${revisaoAtual ?? 0}`
    : "Nova proposta";

  const description = cancelInfo
    ? `Cancelada — ${cancelInfo.motivoLabel}${cancelInfo.obs ? `: ${cancelInfo.obs}` : ""}`
    : clienteNome
      ? `Cliente atual: ${clienteNome}`
      : "Preencha os dados da proposta.";

  const statusOpts = statusOptionsFor(currentStatus ?? "RASCUNHO", isEdit);

  const headerActions = currentStatus ? (
    <Badge variant={STATUS_BADGE_VARIANT[currentStatus]}>
      {STATUS_LABEL[currentStatus]}
    </Badge>
  ) : undefined;

  return (
    <CrudFormShell
      title={title}
      description={description}
      form={form}
      onSubmit={onSubmit}
      onCancel={() =>
        router.push(propostaId ? `/propostas/${propostaId}` : "/propostas")
      }
      submitting={saving}
      readOnly={readOnly}
      headerActions={headerActions}
    >
      <FormSection title="Dados da proposta" cols={1}>
        {/* Modelo da proposta — primeiro campo, ocupando a linha inteira. */}
        <SelectField
          name="modelo"
          label="Modelo da proposta"
          options={MODELO_OPTIONS}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <ClienteAutocompleteField
            name="clienteId"
            label="Cliente"
            initialLabel={clienteNome}
          />
          <SelectField
            name="vendedorId"
            label="Vendedor"
            options={vendedores}
            placeholder="Opcional"
          />
          <NumberField name="validadeDias" label="Validade (dias)" min={1} />
          <SelectField name="status" label="Status" options={statusOpts} />
        </div>
      </FormSection>

      <FormSection title="Observações" cols={1}>
        <TextareaField
          name="obsInternas"
          label="Observações internas"
          description="Uso interno — nunca aparece no PDF nem para o cliente."
          rows={3}
        />
        <TextareaField
          name="obsProposta"
          label="Observações da proposta"
          description="Poderá aparecer no PDF futuramente."
          rows={3}
        />
      </FormSection>
    </CrudFormShell>
  );
}
