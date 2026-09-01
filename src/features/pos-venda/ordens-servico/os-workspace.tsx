"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
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
  CATEGORIAS_CUSTO_OS,
  ORIGEM_OS_LABEL,
  STATUS_OS_BADGE,
  STATUS_OS_LABEL,
  STATUS_OS_ORDER,
} from "@/features/pos-venda/labels";
import { ResumoCustosPosVenda } from "@/features/pos-venda/resumo-custos";
import { TimelinePosVenda } from "@/features/pos-venda/timeline";
import type { OSDetalhe } from "@/features/pos-venda/tipos";
import { UsuarioSelectField } from "@/features/usuarios";
import type { UsuarioOption } from "@/services/usuario.service";

import {
  atualizarOrdemServicoAction,
  atualizarRegistroOSAction,
  cancelarOrdemServicoAction,
  criarRegistroOSAction,
  excluirAnexoOSAction,
  excluirRegistroOSAction,
  finalizarOrdemServicoAction,
} from "./actions";
import { ItensOSEditor } from "./itens-editor";
import { cabecalhoOSSchema, type CabecalhoOSValues } from "./schema";

/**
 * Workspace da Ordem de Serviço de pós-venda (spec §41).
 *
 * Seções: dados gerais, produtos, timeline, diagnóstico/conclusão e custos.
 *
 * ── A FINALIZAÇÃO É DIFERENTE DA TROCA ──────────────────────────────────────
 * Não há diálogo de confirmação para pular. O service exige informação técnica
 * (ADR-0420) — conclusão geral **ou** diagnóstico/solução de ao menos um
 * produto —, e quando falta, a mensagem dele diz exatamente o que preencher.
 *
 * Isso não é rigor gratuito: a OS existe para responder "qual era o defeito e o
 * que foi feito". Uma OS finalizada em branco recria o buraco que o módulo veio
 * fechar. Pendência de devolução, na Troca, tem desfechos legítimos fora do
 * sistema; "consertamos e ninguém sabe o quê" não tem.
 *
 * Cliente e vínculo com a Troca NÃO são editáveis — são definidos na criação.
 */

const STATUS_OPTIONS = STATUS_OS_ORDER.map((value) => ({
  value,
  label: STATUS_OS_LABEL[value],
}));

export function OrdemServicoWorkspace({
  data,
  responsaveis,
}: {
  data: OSDetalhe;
  responsaveis: UsuarioOption[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [status, setStatus] = useState(data.status);

  const readOnly = status === "CANCELADA" || status === "FINALIZADA";

  const form = useForm<CabecalhoOSValues>({
    resolver: zodResolver(cabecalhoOSSchema),
    defaultValues: {
      referencia: data.referencia,
      responsavelId: data.responsavelId,
      status: data.status,
      relatoInicial: data.relatoInicial ?? "",
      diagnosticoConclusao: data.diagnosticoConclusao ?? "",
    },
  });

  async function onSubmit(values: CabecalhoOSValues) {
    setSaving(true);
    const result = await atualizarOrdemServicoAction(data.id, values);

    if (result.success) {
      form.reset(values);
      setStatus(values.status);
      toast.success("Ordem de serviço atualizada.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setSaving(false);
  }

  /**
   * Finaliza direto. Quando a guarda técnica recusa, a mensagem do service —
   * "registre a conclusão técnica geral ou o diagnóstico/solução de pelo menos
   * um produto" — chega ao usuário como está, e é ela que orienta a correção.
   */
  async function finalizar() {
    setFinalizando(true);
    const result = await finalizarOrdemServicoAction(data.id);
    if (result.success) {
      toast.success(`Ordem de serviço ${data.numero} finalizada.`);
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
    const result = await cancelarOrdemServicoAction(data.id, motivo);
    if (result.success) {
      toast.success(`Ordem de serviço ${data.numero} cancelada.`);
      setCancelOpen(false);
      setStatus("CANCELADA");
      form.setValue("status", "CANCELADA");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setCancelando(false);
  }

  return (
    <FormProvider {...form}>
      <AppPage>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          <PageHeader
            title={`OS ${data.numero}`}
            description={`${data.clienteNome} · ${data.referencia}`}
            titleSuffix={
              <Badge variant={STATUS_OS_BADGE[status]}>
                {STATUS_OS_LABEL[status]}
              </Badge>
            }
          />

          {/* Origem com link claro quando há vínculo (spec §41). */}
          <div
            className="rounded-md border bg-muted/40 p-3 text-sm"
            data-testid="origem-os"
          >
            Origem:{" "}
            {data.trocaAntecipadaId && data.trocaNumero !== null ? (
              <Link
                href={`/pos-venda/trocas-antecipadas/${data.trocaAntecipadaId}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Troca {data.trocaNumero}
                {data.trocaReferencia ? ` — ${data.trocaReferencia}` : ""}
              </Link>
            ) : (
              <span className="font-medium">{ORIGEM_OS_LABEL.DIRETA}</span>
            )}
          </div>

          <Card>
            <CardContent className="flex flex-col gap-5">
              <FormSection title="Dados gerais">
                <div className="space-y-2">
                  <Label htmlFor="os-cliente">Cliente</Label>
                  <Input
                    id="os-cliente"
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

              <FormSection title="Relato inicial" cols={1}>
                <TextareaField
                  name="relatoInicial"
                  label="O que foi relatado"
                  rows={3}
                  disabled={readOnly}
                />
              </FormSection>

              {/* Diagnóstico / conclusão GERAL. Junto com o diagnóstico por
                  produto, é o que a guarda de finalização exige (ADR-0420):
                  basta UM dos dois. */}
              <FormSection title="Diagnóstico / conclusão" cols={1}>
                <TextareaField
                  name="diagnosticoConclusao"
                  label="Conclusão técnica geral"
                  rows={4}
                  placeholder="Ex.: falha mecânica do mecanismo interno; conjunto substituído e testado."
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

        {/* Produtos fora do <form> do cabeçalho: Server Action e botão próprios,
            e <form> aninhado é HTML inválido. */}
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Produtos</h2>
          <ItensOSEditor
            ordemServicoId={data.id}
            itens={data.itens}
            readOnly={readOnly}
          />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Timeline</h2>
          {/* Custos DESTA OS. Nunca somados com os da Troca de origem — são
              históricos independentes (spec §36). */}
          <ResumoCustosPosVenda
            titulo="Custo acumulado da ordem de serviço"
            registros={data.registros}
          />
          <TimelinePosVenda
            registros={data.registros}
            readOnly={readOnly}
            responsaveis={responsaveis}
            categorias={CATEGORIAS_CUSTO_OS}
            baseUrlAnexos={(registroId) =>
              `/pos-venda/ordens-de-servico/${data.id}/registros/${registroId}/anexos`
            }
            onCriar={(values) => criarRegistroOSAction(data.id, values)}
            onAtualizar={(registroId, values) =>
              atualizarRegistroOSAction(data.id, registroId, values)
            }
            onExcluir={(registroId) =>
              excluirRegistroOSAction(data.id, registroId)
            }
            onExcluirAnexo={(registroId, anexoId) =>
              excluirAnexoOSAction(data.id, registroId, anexoId)
            }
          />
        </section>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/pos-venda/ordens-de-servico")}
          >
            Voltar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setCancelOpen(true)}
            disabled={status === "CANCELADA" || saving}
          >
            <Ban className="h-4 w-4" />
            Cancelar ordem de serviço
          </Button>
          <Button
            type="button"
            onClick={finalizar}
            disabled={readOnly || finalizando}
          >
            <CheckCircle2 className="h-4 w-4" />
            {finalizando ? "Finalizando…" : "Finalizar ordem de serviço"}
          </Button>
        </div>
      </AppPage>

      <CancelarPosVendaDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        titulo={`Cancelar OS ${data.numero}`}
        rotuloAcao="Cancelar ordem de serviço"
        submitting={cancelando}
        onConfirm={confirmCancelar}
      />
    </FormProvider>
  );
}
