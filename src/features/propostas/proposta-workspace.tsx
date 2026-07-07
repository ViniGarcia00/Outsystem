"use client";

import { AlertTriangle, Ban, FileDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AppPage, PageHeader } from "@/components/app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { WorkspaceDTO } from "@/services/proposta-conteudo.service";
import { formatDate } from "@/utils";

import {
  cancelarPropostaAction,
  emitirPropostaAction,
  salvarCabecalhoAction,
} from "./actions";
import { CancelarDialog } from "./cancelar-dialog";
import { ConteudoEditor } from "./conteudo-editor";
import { serverConteudoActions } from "./conteudo-handlers";
import { STATUS_BADGE_VARIANT, STATUS_LABEL } from "./labels";
import { PropostaCabecalho } from "./proposta-cabecalho";
import type { CabecalhoPatchValues, CancelarFormValues } from "./schema";

interface Option {
  value: string;
  label: string;
}

export function PropostaWorkspace({
  data,
  vendedores,
}: {
  data: WorkspaceDTO;
  vendedores: Option[];
}) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const readOnly = data.readOnly;

  const refresh = () => router.refresh();
  const actions = useMemo(() => serverConteudoActions(data.id), [data.id]);

  // Toast quando o sistema cria automaticamente uma nova revisão (fork pós-emissão).
  const prevRev = useRef<number | null>(null);
  useEffect(() => {
    const atual = data.revisaoAtual;
    if (prevRev.current !== null && atual !== null && atual > prevRev.current) {
      toast.info(
        `Revisão ${atual} criada automaticamente — você está editando um novo rascunho.`,
      );
    }
    prevRev.current = atual;
  }, [data.revisaoAtual]);

  const salvarCabecalho = async (patch: CabecalhoPatchValues) => {
    const result = await salvarCabecalhoAction(data.id, patch);
    if (result.success) refresh();
    else toast.error(result.error);
  };

  const gerarPdf = async () => {
    setBusy(true);
    const result = await emitirPropostaAction(data.id);
    setBusy(false);
    if (result.success) {
      toast.success(`Proposta ${data.proposalNumber} emitida.`);
      refresh();
    } else {
      toast.error(result.error);
    }
  };

  const confirmCancelar = async (values: CancelarFormValues) => {
    const result = await cancelarPropostaAction(data.id, values);
    if (result.success) {
      toast.success(`Proposta ${data.proposalNumber} cancelada.`);
      setCancelOpen(false);
      refresh();
    } else {
      toast.error(result.error);
    }
  };

  const semCliente = !data.clienteId;
  const temItens = data.secoes.some((s) => s.itens.length > 0);
  const podeEmitir = data.status === "RASCUNHO" && !semCliente && temItens;
  const horaSalvo = formatDate(data.updatedAt, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const valores = {
    clienteId: data.clienteId,
    clienteNome: data.clienteNome,
    vendedorId: data.vendedorId,
    modelo: data.modelo,
    validadeDias: data.validadeDias,
    obsInternas: data.obsInternas,
    obsProposta: data.obsProposta,
  };

  return (
    <AppPage>
      <PageHeader
        title={`Proposta ${data.proposalNumber} · Rev.${data.revisaoAtual ?? 0}`}
        description={
          readOnly
            ? "Proposta cancelada — somente leitura."
            : "Workspace da proposta — monte tudo aqui; as alterações salvam automaticamente."
        }
        actions={
          <>
            <Badge variant={STATUS_BADGE_VARIANT[data.status]}>
              {STATUS_LABEL[data.status]}
            </Badge>
            {data.status === "RASCUNHO" && (
              <Button
                onClick={gerarPdf}
                disabled={!podeEmitir || busy}
                title={
                  podeEmitir
                    ? undefined
                    : "Informe o cliente e adicione ao menos um item para emitir."
                }
              >
                <FileDown className="h-4 w-4" />
                Gerar PDF
              </Button>
            )}
            {!readOnly && (
              <Button variant="outline" onClick={() => setCancelOpen(true)}>
                <Ban className="h-4 w-4" />
                Cancelar
              </Button>
            )}
          </>
        }
      />

      {/* Indicador de auto-save / estado */}
      {!readOnly && (
        <p className="text-xs text-muted-foreground">
          {data.status === "EMITIDA"
            ? `Emitida em ${data.revisaoEmitidaAt ? formatDate(data.revisaoEmitidaAt) : "—"}. Ao editar, o sistema cria automaticamente uma nova revisão.`
            : `Todas as alterações são salvas automaticamente. Última alteração salva às ${horaSalvo}.`}
        </p>
      )}

      {/* Aviso de proposta incompleta (sem cliente) */}
      {!readOnly && semCliente && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Proposta incompleta: informe o cliente para poder emitir.</span>
        </div>
      )}

      {/* Cabeçalho editável */}
      <Card>
        <CardContent>
          <PropostaCabecalho
            valores={valores}
            vendedores={vendedores}
            readOnly={readOnly}
            onCampo={salvarCabecalho}
          />
        </CardContent>
      </Card>

      {/* Conteúdo da revisão atual */}
      <ConteudoEditor
        secoes={data.secoes}
        actions={actions}
        readOnly={readOnly}
        refresh={refresh}
        simplificada={data.modelo === "SIMPLIFICADA"}
      />

      <CancelarDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        propostaLabel={`Proposta ${data.proposalNumber}`}
        submitting={busy}
        onConfirm={confirmCancelar}
      />
    </AppPage>
  );
}
