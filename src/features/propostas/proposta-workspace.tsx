"use client";

import { AlertTriangle, Ban, FileDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppPage, PageHeader } from "@/components/app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { WorkspaceDTO } from "@/services/proposta-conteudo.service";
import { formatDate } from "@/utils";

import { cancelarPropostaAction, emitirPropostaAction } from "./actions";
import { CancelarDialog } from "./cancelar-dialog";
import { adicionarSecaoAction } from "./conteudo-actions";
import { STATUS_BADGE_VARIANT, STATUS_LABEL } from "./labels";
import { PropostaCabecalho } from "./proposta-cabecalho";
import type { CancelarFormValues } from "./schema";
import { SecaoCard } from "./secao-card";

interface Option {
  value: string;
  label: string;
}

export function PropostaWorkspace({
  data,
  produtos,
  vendedores,
}: {
  data: WorkspaceDTO;
  produtos: Option[];
  vendedores: Option[];
}) {
  const router = useRouter();
  const [novaSecao, setNovaSecao] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const readOnly = data.readOnly;

  const refresh = () => router.refresh();

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

  const adicionarSecao = async () => {
    const nome = novaSecao.trim();
    if (!nome) return;
    const result = await adicionarSecaoAction(data.id, nome);
    if (result.success) {
      setNovaSecao("");
      refresh();
    } else {
      toast.error(result.error);
    }
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
            data={data}
            vendedores={vendedores}
            readOnly={readOnly}
            onSaved={refresh}
          />
        </CardContent>
      </Card>

      {/* Conteúdo da revisão atual */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Conteúdo — Rev.{data.revisaoAtual ?? 0}
        </h2>

        {data.secoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma seção nesta revisão.
            {!readOnly && " Adicione a primeira seção abaixo."}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {data.secoes.map((secao, index) => (
              <SecaoCard
                key={secao.id}
                secao={secao}
                produtos={produtos}
                readOnly={readOnly}
                isFirst={index === 0}
                isLast={index === data.secoes.length - 1}
                refresh={refresh}
              />
            ))}
          </div>
        )}

        {!readOnly && (
          <div className="flex items-center gap-2">
            <Input
              value={novaSecao}
              onChange={(e) => setNovaSecao(e.target.value)}
              placeholder="Nome da nova seção (ex.: Sala)"
              className="max-w-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  adicionarSecao();
                }
              }}
            />
            <Button variant="outline" onClick={adicionarSecao}>
              <Plus className="h-4 w-4" />
              Adicionar seção
            </Button>
          </div>
        )}
      </section>

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
