"use client";

import { Ban, CheckCircle2, ClipboardPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { AppPage, PageHeader } from "@/components/app";
import {
  FormSection,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CancelarPosVendaDialog } from "@/features/pos-venda/cancelar-dialog";
import {
  CATEGORIAS_CUSTO_TROCA,
  DESTINATARIO_LABEL,
  DESTINATARIO_ORDER,
  STATUS_TROCA_BADGE,
  STATUS_TROCA_LABEL,
  STATUS_TROCA_ORDER,
  exigeDestinatarioNome,
} from "@/features/pos-venda/labels";
import { ResumoCustosPosVenda } from "@/features/pos-venda/resumo-custos";
import { TimelinePosVenda } from "@/features/pos-venda/timeline";
import type { PendenciaRetorno, TrocaDetalhe } from "@/features/pos-venda/tipos";
import { criarOSDaTrocaAction } from "@/features/pos-venda/ordens-servico/actions";
import { UsuarioSelectField } from "@/features/usuarios";
import type { UsuarioOption } from "@/services/usuario.service";

import {
  atualizarTrocaAction,
  cancelarTrocaAction,
  criarRegistroTrocaAction,
  atualizarRegistroTrocaAction,
  excluirAnexoTrocaAction,
  excluirRegistroTrocaAction,
  finalizarTrocaAction,
  pendenciasDaTrocaAction,
} from "./actions";
import { FinalizarTrocaDialog } from "./finalizar-dialog";
import { ItensTrocaEditor } from "./itens-editor";
import { cabecalhoTrocaSchema, type CabecalhoTrocaValues } from "./schema";

/**
 * Workspace da Troca Antecipada (spec §20).
 *
 * Seções, na ordem da spec: dados gerais, produtos, timeline, diagnóstico e
 * resumo de custos.
 *
 * ── TRÊS SALVAMENTOS INDEPENDENTES, DE PROPÓSITO ────────────────────────────
 * O cabeçalho tem "Salvar alterações"; a grade de produtos tem "Salvar
 * produtos"; a timeline grava por diálogo. São três Server Actions distintas
 * porque são três atos distintos do trabalho real — anotar que 5 dos 7
 * voltaram não deveria arrastar junto uma mudança de status pela metade.
 *
 * Nenhum deles navega para fora: ao contrário da Instalação (ADR-0413), a Troca
 * é acompanhada ao longo de dias, e mandar o usuário para a listagem a cada
 * lançamento seria devolvê-lo ao começo o tempo todo.
 *
 * Cliente NÃO é editável — o vínculo é definido na criação.
 */

const STATUS_OPTIONS = STATUS_TROCA_ORDER.map((value) => ({
  value,
  label: STATUS_TROCA_LABEL[value],
}));

const DESTINATARIO_OPTIONS = DESTINATARIO_ORDER.map((value) => ({
  value,
  label: DESTINATARIO_LABEL[value],
}));

export function TrocaWorkspace({
  data,
  responsaveis,
}: {
  data: TrocaDetalhe;
  responsaveis: UsuarioOption[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [finalizarOpen, setFinalizarOpen] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [pendencias, setPendencias] = useState<PendenciaRetorno[]>([]);
  const [abrindoOS, setAbrindoOS] = useState(false);
  const [status, setStatus] = useState(data.status);

  /** Cancelada e finalizada são terminais NA TELA — nunca por exclusão. */
  const readOnly = status === "CANCELADA" || status === "FINALIZADA";

  const form = useForm<CabecalhoTrocaValues>({
    resolver: zodResolver(cabecalhoTrocaSchema),
    defaultValues: {
      referencia: data.referencia,
      responsavelId: data.responsavelId,
      status: data.status,
      destinatarioTipo: data.destinatarioTipo,
      destinatarioNome: data.destinatarioNome ?? "",
      relatoInicial: data.relatoInicial ?? "",
      diagnosticoConclusao: data.diagnosticoConclusao ?? "",
    },
  });

  const destinatarioTipo = useWatch({
    control: form.control,
    name: "destinatarioTipo",
  });

  async function onSubmit(values: CabecalhoTrocaValues) {
    setSaving(true);
    const result = await atualizarTrocaAction(data.id, values);

    if (result.success) {
      // Limpa o "dirty": sem isso o guard avisaria sobre alterações já gravadas.
      form.reset(values);
      setStatus(values.status);
      toast.success("Troca atualizada.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setSaving(false);
  }

  /**
   * Abre o diálogo de finalização carregando as pendências ANTES. É o que
   * transforma um "tem certeza?" genérico na confirmação forte da spec §12: o
   * usuário vê item a item o que não voltou.
   */
  async function abrirFinalizacao() {
    setPendencias(await pendenciasDaTrocaAction(data.id));
    setFinalizarOpen(true);
  }

  async function confirmarFinalizacao() {
    setFinalizando(true);
    // `true` porque o usuário JÁ viu a lista e confirmou. Sem essa confirmação
    // explícita o service recusa — e é assim que deve ser.
    const result = await finalizarTrocaAction(data.id, true);
    if (result.success) {
      toast.success(`Troca ${data.numero} finalizada.`);
      setFinalizarOpen(false);
      setStatus("FINALIZADA");
      form.setValue("status", "FINALIZADA");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setFinalizando(false);
  }

  async function confirmCancelar(motivo: string) {
    setCancelando(true);
    const result = await cancelarTrocaAction(data.id, motivo);
    if (result.success) {
      toast.success(`Troca ${data.numero} cancelada.`);
      setCancelOpen(false);
      setStatus("CANCELADA");
      form.setValue("status", "CANCELADA");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setCancelando(false);
  }

  /**
   * Abre a OS a partir desta Troca (spec §27) — conveniência.
   *
   * O que a OS recebe é um SNAPSHOT dos produtos DEVOLVIDOS naquele instante
   * (ADR-0419). O service recusa quando nada foi devolvido ainda, e a mensagem
   * dele é o que o usuário lê.
   */
  async function abrirOS() {
    setAbrindoOS(true);
    const result = await criarOSDaTrocaAction(data.id);
    if (result.success) {
      toast.success(`Ordem de serviço ${result.data.numero} aberta.`);
      router.push(`/pos-venda/ordens-de-servico/${result.data.id}`);
    } else {
      toast.error(result.error);
      setAbrindoOS(false);
    }
  }

  return (
    <FormProvider {...form}>
      <AppPage>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          <PageHeader
            title={`Troca ${data.numero}`}
            description={`${data.clienteNome} · ${data.referencia}`}
            titleSuffix={
              <Badge variant={STATUS_TROCA_BADGE[status]}>
                {STATUS_TROCA_LABEL[status]}
              </Badge>
            }
          />

          {data.ordemServico && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              Ordem de serviço vinculada:{" "}
              <Link
                href={`/pos-venda/ordens-de-servico/${data.ordemServico.id}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                OS {data.ordemServico.numero}
              </Link>
            </div>
          )}

          {/* 1. Dados gerais */}
          <Card>
            <CardContent className="flex flex-col gap-5">
              <FormSection title="Dados gerais">
                <div className="space-y-2">
                  <Label htmlFor="troca-cliente">Cliente</Label>
                  <Input
                    id="troca-cliente"
                    value={data.clienteNome}
                    readOnly
                    disabled
                    aria-label="Cliente"
                  />
                </div>
                <TextField
                  name="referencia"
                  label="Referência"
                  disabled={readOnly}
                />
                <UsuarioSelectField
                  name="responsavelId"
                  label="Responsável"
                  options={responsaveis}
                  placeholder="Selecione o responsável"
                  opcional
                  disabled={readOnly}
                />
                <SelectField
                  name="status"
                  label="Status"
                  options={STATUS_OPTIONS}
                />
              </FormSection>

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
                    disabled={readOnly}
                  />
                )}
              </FormSection>

              <FormSection title="Relato inicial" cols={1}>
                <TextareaField
                  name="relatoInicial"
                  label="O que o cliente relatou"
                  rows={3}
                  disabled={readOnly}
                />
              </FormSection>

              {/* 4. Diagnóstico / conclusão — OPCIONAL e nunca bloqueia a
                  finalização (spec §16). A análise técnica principal acontece
                  depois, na Ordem de Serviço. */}
              <FormSection title="Diagnóstico / conclusão" cols={1}>
                <TextareaField
                  name="diagnosticoConclusao"
                  label="Conclusão desta troca (opcional)"
                  rows={3}
                  placeholder="Ex.: peça devolvida com trinca visível na carcaça; encaminhada para análise."
                  disabled={readOnly}
                />
              </FormSection>

              <div className="flex justify-end border-t pt-4">
                <Button type="submit" disabled={readOnly || saving}>
                  {saving ? "Salvando…" : "Salvar alterações"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* 2. Produtos — fora do <form> do cabeçalho: tem Server Action e botão
            próprios, e um <form> aninhado é HTML inválido. */}
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Produtos</h2>
          <ItensTrocaEditor
            trocaId={data.id}
            itens={data.itens}
            readOnly={readOnly}
          />
        </section>

        {/* 5. Resumo de custos — DESTA troca. Nunca somado com o da OS. */}
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Timeline</h2>
          <ResumoCustosPosVenda
            titulo="Custo acumulado da troca"
            registros={data.registros}
          />
          {/* 3. Timeline */}
          <TimelinePosVenda
            registros={data.registros}
            readOnly={readOnly}
            responsaveis={responsaveis}
            categorias={CATEGORIAS_CUSTO_TROCA}
            baseUrlAnexos={(registroId) =>
              `/pos-venda/trocas-antecipadas/${data.id}/registros/${registroId}/anexos`
            }
            onCriar={(values) => criarRegistroTrocaAction(data.id, values)}
            onAtualizar={(registroId, values) =>
              atualizarRegistroTrocaAction(data.id, registroId, values)
            }
            onExcluir={(registroId) =>
              excluirRegistroTrocaAction(data.id, registroId)
            }
            onExcluirAnexo={(registroId, anexoId) =>
              excluirAnexoTrocaAction(data.id, registroId, anexoId)
            }
          />
        </section>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/pos-venda/trocas-antecipadas")}
          >
            Voltar
          </Button>
          {/* Disponível mesmo com a troca finalizada: a análise técnica acontece
              DEPOIS do retorno, e é justamente aí que a troca já fechou. Só não
              aparece quando já existe OS (a cardinalidade é zero-ou-uma). */}
          {!data.ordemServico && status !== "CANCELADA" && (
            <Button
              type="button"
              variant="outline"
              onClick={abrirOS}
              disabled={abrindoOS}
            >
              <ClipboardPlus className="h-4 w-4" />
              {abrindoOS ? "Abrindo…" : "Criar Ordem de Serviço"}
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            onClick={() => setCancelOpen(true)}
            disabled={status === "CANCELADA" || saving}
          >
            <Ban className="h-4 w-4" />
            Cancelar troca
          </Button>
          <Button type="button" onClick={abrirFinalizacao} disabled={readOnly}>
            <CheckCircle2 className="h-4 w-4" />
            Finalizar troca
          </Button>
        </div>
      </AppPage>

      <FinalizarTrocaDialog
        open={finalizarOpen}
        onOpenChange={setFinalizarOpen}
        pendencias={pendencias}
        submitting={finalizando}
        onConfirm={confirmarFinalizacao}
      />

      <CancelarPosVendaDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        titulo={`Cancelar Troca ${data.numero}`}
        rotuloAcao="Cancelar troca"
        submitting={cancelando}
        onConfirm={confirmCancelar}
      />
    </FormProvider>
  );
}
