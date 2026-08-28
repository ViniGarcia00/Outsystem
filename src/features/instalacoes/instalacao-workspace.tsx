"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
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
import type { InstalacaoDetalhe } from "@/services/instalacao.service";
import { UsuarioSelectField } from "@/features/usuarios";
import type { UsuarioOption } from "@/services/usuario.service";

import { atualizarInstalacaoAction, cancelarInstalacaoAction } from "./actions";
import { CancelarInstalacaoDialog } from "./cancelar-instalacao-dialog";
import { Cronologia } from "./cronologia";
import { dataParaInput } from "./datas";
import { EnderecoSnapshot } from "./endereco-snapshot";
import { STATUS_BADGE_VARIANT, STATUS_LABEL, STATUS_ORDER } from "./labels";
import { PropostaAutocomplete } from "./proposta-autocomplete";
import { ResumoCustos } from "./resumo-custos";
import {
  cabecalhoInstalacaoSchema,
  type CabecalhoInstalacaoValues,
} from "./schema";

const STATUS_OPTIONS = STATUS_ORDER.map((value) => ({
  value,
  label: STATUS_LABEL[value],
}));

const NOTA_ENDERECO =
  "Copiado do cadastro do cliente na criação da instalação. " +
  "O endereço da instalação não muda quando o cadastro do cliente é alterado.";

/**
 * Workspace operacional da Instalação (Sprint 4.0.1).
 *
 * Cliente e endereço NÃO são editáveis — o snapshot é imutável depois da
 * criação (ADR-0400) e `cabecalhoInstalacaoSchema` sequer os declara.
 *
 * Concluir é escolher o status "Concluída" e salvar; não há botão próprio.
 *
 * A seção Cronologia (Sprint 4.0.2) traz o resumo de custos e a timeline de
 * acontecimentos. Os registros chegam já ordenados do service.
 */
export function InstalacaoWorkspace({
  data,
  tecnicos,
}: {
  data: InstalacaoDetalhe;
  tecnicos: UsuarioOption[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [propostaLabel, setPropostaLabel] = useState<string | null>(
    data.propostaLabel,
  );
  const [status, setStatus] = useState(data.status);

  const readOnly = status === "CANCELADA";

  const form = useForm<CabecalhoInstalacaoValues>({
    resolver: zodResolver(cabecalhoInstalacaoSchema),
    defaultValues: {
      apelido: data.apelido,
      propostaId: data.propostaId,
      tecnicoResponsavelId: data.tecnicoResponsavelId,
      status: data.status,
      dataPrevista: dataParaInput(data.dataPrevista),
      dataAgendada: dataParaInput(data.dataAgendada),
      periodo: data.periodo ?? "",
      observacoes: data.observacoes ?? "",
    },
  });

  // useWatch em vez de form.watch(): watch() devolve função não-memoizável e o
  // React Compiler pula a memoização do componente inteiro.
  const propostaIdAtual = useWatch({
    control: form.control,
    name: "propostaId",
  });

  async function onSubmit(values: CabecalhoInstalacaoValues) {
    setSaving(true);
    const result = await atualizarInstalacaoAction(data.id, values);

    if (result.success) {
      // Limpa o "dirty" ANTES de navegar: sem isso o guard de saída avisaria
      // sobre alterações que já foram gravadas.
      form.reset(values);
      toast.success("Instalação atualizada.");
      /**
       * Salvar os DADOS GERAIS volta para a listagem (ADR-0413).
       *
       * A cronologia NÃO segue esta regra: criar, editar e excluir Registro
       * permanecem no workspace. A separação é física — os registros vivem em
       * `Cronologia`/`RegistroDialog`, com Server Actions próprias que só
       * revalidam `/instalacoes/[id]`. Não há condicional a manter aqui.
       *
       * `setStatus` saiu junto: seria inócuo, porque a página sai. O badge é
       * recalculado do dado persistido na próxima abertura.
       */
      router.push("/instalacoes");
    } else {
      toast.error(result.error);
      setSaving(false);
    }
  }

  async function confirmCancelar(motivo: string) {
    setCancelando(true);
    const result = await cancelarInstalacaoAction(data.id, motivo);
    if (result.success) {
      toast.success(`Instalação ${data.numero} cancelada.`);
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
            title={`Instalação ${data.numero}`}
            description={data.clienteNome}
            titleSuffix={
              <Badge variant={STATUS_BADGE_VARIANT[status]}>
                {STATUS_LABEL[status]}
              </Badge>
            }
          />

          {/* Mesma superfície de card do `PageForm`/`CrudFormShell` — é o que
              faz o workspace parecer com Cliente, Produto e Nova instalação. */}
          <Card>
            <CardContent className="flex flex-col gap-5">
              <FormSection title="Dados da instalação">
                <div className="space-y-2">
                  <Label htmlFor="instalacao-cliente">Cliente</Label>
                  <Input
                    id="instalacao-cliente"
                    value={data.clienteNome}
                    readOnly
                    disabled
                    aria-label="Cliente"
                  />
                </div>
                {/* Editável depois da criação, ao contrário do endereço: o
                    apelido é rótulo operacional, não snapshot (ADR-0413). */}
                <TextField
                  name="apelido"
                  label="Apelido"
                  placeholder="Ex.: Casa Alphaville, Apartamento Moema"
                  disabled={readOnly}
                />
                <PropostaAutocomplete
                  value={propostaIdAtual}
                  initialLabel={propostaLabel}
                  onSelect={(p) => {
                    form.setValue("propostaId", p?.id ?? null, {
                      shouldDirty: true,
                    });
                    setPropostaLabel(p?.label ?? null);
                  }}
                  disabled={readOnly}
                />
                <UsuarioSelectField
                  name="tecnicoResponsavelId"
                  label="Responsável atual"
                  options={tecnicos}
                  placeholder="Selecione o técnico"
                  opcional
                  disabled={readOnly}
                />
                <SelectField
                  name="status"
                  label="Status"
                  options={STATUS_OPTIONS}
                />
              </FormSection>

              <EnderecoSnapshot endereco={data} nota={NOTA_ENDERECO} />

              {/* Três campos curtos em uma linha no desktop: `cols={2}` deixaria
                  "Período" órfão ocupando meia largura sozinho. */}
              <FormSection title="Programação" cols={3}>
                <TextField
                  name="dataPrevista"
                  label="Data prevista"
                  type="date"
                  disabled={readOnly}
                />
                <TextField
                  name="dataAgendada"
                  label="Data agendada"
                  type="date"
                  disabled={readOnly}
                />
                <TextField
                  name="periodo"
                  label="Período"
                  placeholder="Ex.: manhã, 14h às 17h"
                  disabled={readOnly}
                />
              </FormSection>

              <FormSection title="Observações" cols={1}>
                <TextareaField
                  name="observacoes"
                  label="Observações gerais"
                  rows={4}
                  disabled={readOnly}
                />
              </FormSection>
            </CardContent>
          </Card>

          {/* Cronologia fora do card do formulário: os registros já são cards
              próprios — aninhá-los criaria card dentro de card. Mesmo arranjo
              que Conteúdo/Serviços no workspace da Proposta. */}
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold tracking-tight">Cronologia</h2>
            <ResumoCustos registros={data.registros} />
            <Cronologia
              instalacaoId={data.id}
              registros={data.registros}
              readOnly={readOnly}
              tecnicos={tecnicos}
            />
          </section>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/instalacoes")}
            >
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setCancelOpen(true)}
              disabled={readOnly || saving}
            >
              <Ban className="h-4 w-4" />
              Cancelar instalação
            </Button>
            <Button type="submit" disabled={readOnly || saving}>
              Salvar Alterações
            </Button>
          </div>
        </form>
      </AppPage>

      <CancelarInstalacaoDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        instalacaoLabel={`Instalação ${data.numero}`}
        submitting={cancelando}
        onConfirm={confirmCancelar}
      />
    </FormProvider>
  );
}
