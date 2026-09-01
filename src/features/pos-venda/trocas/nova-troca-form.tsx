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
import {
  DESTINATARIO_LABEL,
  DESTINATARIO_ORDER,
  STATUS_TROCA_LABEL,
  STATUS_TROCA_ORDER,
  exigeDestinatarioNome,
} from "@/features/pos-venda/labels";
import { ClienteAutocomplete } from "@/features/propostas/cliente-autocomplete";
import { UsuarioSelectField } from "@/features/usuarios";
import type { UsuarioOption } from "@/services/usuario.service";

import { criarTrocaAction } from "./actions";
import { novaTrocaSchema, type NovaTrocaValues } from "./schema";

/**
 * Criação de Troca Antecipada (spec §21).
 *
 * O fluxo inicial é o mínimo que identifica o processo: cliente, referência,
 * responsável, relato e para quem foi enviado. **Produtos não entram aqui** —
 * eles são cadastrados no workspace, que é onde a troca passa a viver, e onde
 * as quantidades de devolução vão sendo atualizadas ao longo dos dias.
 *
 * Ao salvar, abre o WORKSPACE (spec §21), não a listagem. É o inverso da
 * Instalação (ADR-0413), e de propósito: lá o cadastro termina no momento em
 * que é criado; aqui a troca nasce incompleta — falta dizer o que foi enviado —
 * e mandar o usuário para a tabela seria pedir que ele encontre de volta a
 * linha que acabou de criar.
 */

const STATUS_OPTIONS = STATUS_TROCA_ORDER.filter(
  (s) => s !== "CANCELADA" && s !== "FINALIZADA",
).map((value) => ({ value, label: STATUS_TROCA_LABEL[value] }));

const DESTINATARIO_OPTIONS = DESTINATARIO_ORDER.map((value) => ({
  value,
  label: DESTINATARIO_LABEL[value],
}));

export function NovaTrocaForm({
  responsaveis,
}: {
  responsaveis: UsuarioOption[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [clienteLabel, setClienteLabel] = useState<string | null>(null);

  const form = useForm<NovaTrocaValues>({
    resolver: zodResolver(novaTrocaSchema),
    defaultValues: {
      clienteId: "",
      referencia: "",
      responsavelId: null,
      relatoInicial: "",
      status: "ABERTA",
      destinatarioTipo: "CLIENTE",
      destinatarioNome: "",
    },
  });

  // useWatch em vez de form.watch(): watch() devolve função não-memoizável e o
  // React Compiler pula a memoização do componente inteiro.
  const clienteIdAtual = useWatch({ control: form.control, name: "clienteId" });
  const destinatarioTipo = useWatch({
    control: form.control,
    name: "destinatarioTipo",
  });

  async function onSubmit(values: NovaTrocaValues) {
    setSaving(true);
    const result = await criarTrocaAction(values);

    if (result.success) {
      form.reset(values); // limpa o "dirty" antes de navegar (evita o guard)
      toast.success(`Troca antecipada ${result.data.numero} criada.`);
      router.push(`/pos-venda/trocas-antecipadas/${result.data.id}`);
    } else {
      setSaving(false);
      toast.error(result.error);
    }
  }

  return (
    <FormProvider {...form}>
      <CrudFormShell
        title="Nova troca antecipada"
        description="Envio de substituto antes do retorno do produto com defeito."
        form={form}
        onSubmit={onSubmit}
        onCancel={() => router.push("/pos-venda/trocas-antecipadas")}
        submitting={saving}
      >
        <FormSection title="Dados da troca">
          <ClienteAutocomplete
            value={clienteIdAtual || null}
            initialLabel={clienteLabel}
            onSelect={(c) => {
              form.setValue("clienteId", c?.id ?? "", {
                shouldDirty: true,
                shouldValidate: true,
              });
              setClienteLabel(c?.label ?? null);
            }}
            autoFocus
          />
          <TextField
            name="referencia"
            label="Referência"
            placeholder="Ex.: Fechadura entrada social, 7 interruptores sala/cozinha"
          />
          <UsuarioSelectField
            name="responsavelId"
            label="Responsável"
            options={responsaveis}
            placeholder="Selecione o responsável"
            opcional
          />
          <SelectField name="status" label="Status" options={STATUS_OPTIONS} />
        </FormSection>

        {/* Destinatário do SUBSTITUTO — quem recebeu a peça nova. Quando é o
            próprio cliente, o nome é dispensado: a troca já aponta para ele. */}
        <FormSection title="Destinatário do envio">
          <SelectField
            name="destinatarioTipo"
            label="Enviado para"
            options={DESTINATARIO_OPTIONS}
          />
          {exigeDestinatarioNome(destinatarioTipo) && (
            <TextField
              name="destinatarioNome"
              label="Nome do destinatário"
              placeholder="Ex.: Instalador Marcos / Portaria do edifício"
            />
          )}
        </FormSection>

        <FormSection title="Relato inicial" cols={1}>
          <TextareaField
            name="relatoInicial"
            label="O que o cliente relatou"
            rows={4}
            placeholder="Ex.: fechadura não abre pelo aplicativo e trava intermitentemente."
          />
        </FormSection>
      </CrudFormShell>
    </FormProvider>
  );
}
