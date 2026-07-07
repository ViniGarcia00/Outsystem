"use client";

import { AlertTriangle, Ban, FileDown, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { AppPage, PageHeader } from "@/components/app";
import { confirmDiscardChanges, FormDirtyGuard } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { WorkspaceDTO } from "@/services/proposta-conteudo.service";
import { formatDate } from "@/utils";

import {
  cancelarPropostaAction,
  emitirPropostaAction,
  salvarPropostaAction,
} from "./actions";
import { CancelarDialog } from "./cancelar-dialog";
import { ConteudoEditor } from "./conteudo-editor";
import { useConteudoMemoria } from "./conteudo-memoria";
import { FinalizacaoProposta } from "./finalizacao-proposta";
import { MOTIVO_LABEL, STATUS_BADGE_VARIANT, STATUS_LABEL } from "./labels";
import {
  PropostaCabecalho,
  type CabecalhoValores,
} from "./proposta-cabecalho";
import type { CabecalhoPatchValues, CancelarFormValues } from "./schema";
import type { Desconto } from "./totais";

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
  const readOnly = data.readOnly;

  const [header, setHeader] = useState<CabecalhoValores>({
    clienteId: data.clienteId,
    clienteNome: data.clienteNome,
    vendedorId: data.vendedorId,
    modelo: data.modelo,
    validadeDias: data.validadeDias,
    obsInternas: data.obsInternas,
    obsProposta: data.obsProposta,
    formaPagamento: data.formaPagamento,
    previsaoInstalacao: data.previsaoInstalacao,
    obsComerciais: data.obsComerciais,
    obsTecnicas: data.obsTecnicas,
  });
  const [desconto, setDesconto] = useState<Desconto>({
    tipo: data.descontoTipo,
    valor: data.descontoValor,
  });
  const [frete, setFrete] = useState<number>(data.frete);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const marcarSujo = useCallback(() => setDirty(true), []);
  const { secoes, actions } = useConteudoMemoria(data.secoes, marcarSujo);

  const onDesconto = (d: Desconto) => {
    setDirty(true);
    setDesconto(d);
  };

  const onFrete = (f: number) => {
    setDirty(true);
    setFrete(f);
  };

  const onCampo = (patch: CabecalhoPatchValues) => {
    setDirty(true);
    setHeader((h) => ({
      ...h,
      ...(patch.clienteId !== undefined ? { clienteId: patch.clienteId } : {}),
      ...(patch.vendedorId !== undefined
        ? { vendedorId: patch.vendedorId }
        : {}),
      ...(patch.modelo !== undefined ? { modelo: patch.modelo } : {}),
      ...(patch.validadeDias !== undefined
        ? { validadeDias: patch.validadeDias }
        : {}),
      ...(patch.obsInternas !== undefined
        ? { obsInternas: patch.obsInternas ?? "" }
        : {}),
      ...(patch.obsProposta !== undefined
        ? { obsProposta: patch.obsProposta ?? "" }
        : {}),
      ...(patch.formaPagamento !== undefined
        ? { formaPagamento: patch.formaPagamento ?? "" }
        : {}),
      ...(patch.previsaoInstalacao !== undefined
        ? { previsaoInstalacao: patch.previsaoInstalacao ?? "" }
        : {}),
      ...(patch.obsComerciais !== undefined
        ? { obsComerciais: patch.obsComerciais ?? "" }
        : {}),
      ...(patch.obsTecnicas !== undefined
        ? { obsTecnicas: patch.obsTecnicas ?? "" }
        : {}),
    }));
  };

  const salvar = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    const result = await salvarPropostaAction(data.id, {
      clienteId: header.clienteId,
      vendedorId: header.vendedorId,
      modelo: header.modelo,
      validadeDias: header.validadeDias,
      obsInternas: header.obsInternas || null,
      obsProposta: header.obsProposta || null,
      formaPagamento: header.formaPagamento || null,
      previsaoInstalacao: header.previsaoInstalacao || null,
      obsComerciais: header.obsComerciais || null,
      obsTecnicas: header.obsTecnicas || null,
      descontoTipo: desconto.tipo,
      descontoValor: desconto.valor,
      frete,
      secoes: secoes.map((s) => ({
        nome: s.nome,
        itens: s.itens.map((it) => ({
          produtoId: it.produtoId as string,
          quantidade: it.quantidade,
          valorProduto: it.valorProduto,
          valorServico: it.valorServico,
        })),
      })),
    });
    if (result.success) {
      setDirty(false); // libera o guard antes do refresh/remontagem
      if (result.data.forked) {
        toast.info(
          `Revisão ${result.data.revisaoAtual} criada automaticamente ao salvar.`,
        );
      } else {
        toast.success("Alterações salvas.");
      }
      router.refresh();
    } else {
      setSaving(false);
      toast.error(result.error);
    }
  };

  const abrirPdf = () => {
    window.open(`/propostas/${data.id}/pdf`, "_blank", "noopener");
  };

  const gerarPdf = async () => {
    setSaving(true);
    const result = await emitirPropostaAction(data.id);
    setSaving(false);
    if (result.success) {
      toast.success(`Proposta ${data.proposalNumber} emitida.`);
      abrirPdf();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const cancelarProposta = () => {
    if (dirty && !confirmDiscardChanges()) return;
    setDirty(false);
    setCancelOpen(true);
  };

  const confirmCancelar = async (values: CancelarFormValues) => {
    const result = await cancelarPropostaAction(data.id, values);
    if (result.success) {
      toast.success(`Proposta ${data.proposalNumber} cancelada.`);
      setCancelOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const voltar = () => {
    if (dirty && !confirmDiscardChanges()) return;
    setDirty(false);
    router.push("/propostas");
  };

  const semCliente = !header.clienteId;
  const temItens = secoes.some((s) => s.itens.length > 0);
  const podeEmitir =
    data.status === "RASCUNHO" && !dirty && !semCliente && temItens;
  const horaSalvo = formatDate(data.updatedAt, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const valores: CabecalhoValores = header;

  return (
    <AppPage>
      {/* Aviso ao sair (links de navegação + fechar/atualizar aba). */}
      <FormDirtyGuard when={dirty && !readOnly} />

      <PageHeader
        title={`Proposta ${data.proposalNumber} · Rev.${data.revisaoAtual ?? 0}`}
        description={
          readOnly
            ? "Proposta cancelada — somente leitura."
            : "Workspace da proposta — as alterações são gravadas ao clicar em Salvar Alterações."
        }
        actions={
          <>
            <Badge variant={STATUS_BADGE_VARIANT[data.status]}>
              {STATUS_LABEL[data.status]}
            </Badge>
            {!readOnly && (
              <Button onClick={salvar} disabled={!dirty || saving}>
                <Save className="h-4 w-4" />
                Salvar Alterações
              </Button>
            )}
            {data.status === "RASCUNHO" && (
              <Button
                variant="outline"
                onClick={gerarPdf}
                disabled={!podeEmitir || saving}
                title={
                  dirty
                    ? "Salve as alterações antes de gerar o PDF."
                    : podeEmitir
                      ? undefined
                      : "Informe o cliente e adicione ao menos um item para emitir."
                }
              >
                <FileDown className="h-4 w-4" />
                Gerar PDF
              </Button>
            )}
            {data.status === "EMITIDA" && (
              <Button variant="outline" onClick={abrirPdf}>
                <FileDown className="h-4 w-4" />
                Abrir PDF
              </Button>
            )}
            {!readOnly && (
              <Button variant="outline" onClick={cancelarProposta}>
                <Ban className="h-4 w-4" />
                Cancelar
              </Button>
            )}
            <Button variant="ghost" onClick={voltar}>
              Voltar
            </Button>
          </>
        }
      />

      {/* Motivo do cancelamento — logo abaixo do número (destaque discreto). */}
      {data.status === "CANCELADA" && data.motivoCancelamento && (
        <div className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <Ban className="h-4 w-4 shrink-0" />
          <span>
            <span className="font-medium">Motivo do cancelamento:</span>{" "}
            {MOTIVO_LABEL[data.motivoCancelamento]}
            {data.obsCancelamento ? ` — ${data.obsCancelamento}` : ""}
          </span>
        </div>
      )}

      {/* Indicador de alterações pendentes / estado */}
      {!readOnly && (
        <p className="text-xs text-muted-foreground">
          {dirty ? (
            <span className="text-amber-700 dark:text-amber-400">
              Há alterações não salvas. Clique em “Salvar Alterações”.
            </span>
          ) : data.status === "EMITIDA" ? (
            `Emitida em ${data.revisaoEmitidaAt ? formatDate(data.revisaoEmitidaAt) : "—"}. Ao salvar qualquer alteração, o sistema cria automaticamente uma nova revisão.`
          ) : (
            `Sem alterações pendentes. Última gravação às ${horaSalvo}.`
          )}
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
            onCampo={onCampo}
          />
        </CardContent>
      </Card>

      {/* Conteúdo da revisão atual */}
      <ConteudoEditor
        secoes={secoes}
        actions={actions}
        readOnly={readOnly}
        refresh={() => {}}
        simplificada={header.modelo === "SIMPLIFICADA"}
        desconto={desconto}
        onDescontoChange={onDesconto}
        frete={frete}
        onFreteChange={onFrete}
      />

      {/* Finalização — informações comerciais finais (ADR-0222) */}
      <FinalizacaoProposta
        valores={valores}
        simplificada={header.modelo === "SIMPLIFICADA"}
        readOnly={readOnly}
        onCampo={onCampo}
      />

      <CancelarDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        propostaLabel={`Proposta ${data.proposalNumber}`}
        submitting={saving}
        onConfirm={confirmCancelar}
      />
    </AppPage>
  );
}
