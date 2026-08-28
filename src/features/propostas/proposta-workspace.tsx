"use client";

import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  FileDown,
  Save,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { AppPage, PageHeader } from "@/components/app";
import {
  ConfirmDialog,
  confirmDiscardChanges,
  FormDirtyGuard,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { WorkspaceDTO } from "@/services/proposta-conteudo.service";
import { formatDate } from "@/utils";

import {
  aprovarPropostaAction,
  cancelarPropostaAction,
  desfazerAprovacaoAction,
  emitirPropostaAction,
  salvarPropostaAction,
} from "./actions";
import { CancelarDialog } from "./cancelar-dialog";
import { ConteudoEditor } from "./conteudo-editor";
import { useConteudoMemoria } from "./conteudo-memoria";
import { FinalizacaoProposta } from "./finalizacao-proposta";
import {
  MOTIVO_LABEL,
  STATUS_BADGE_CLASS,
  STATUS_BADGE_VARIANT,
  STATUS_LABEL,
} from "./labels";
import {
  PropostaCabecalho,
  type CabecalhoValores,
} from "./proposta-cabecalho";
import { ResumoFinanceiro } from "./resumo-financeiro";
import type { CabecalhoPatchValues, CancelarFormValues } from "./schema";
import { ServicosComplementares } from "./servicos-complementares";
import { useServicosMemoria } from "./servicos-memoria";
import { calcularResumoFinanceiro, type Desconto } from "./totais";

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
    nomeProjeto: data.nomeProjeto,
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
  const [aprovando, setAprovando] = useState(false);
  const [desfazerOpen, setDesfazerOpen] = useState(false);

  const marcarSujo = useCallback(() => setDirty(true), []);
  const { secoes, actions } = useConteudoMemoria(data.secoes, marcarSujo);
  const { servicos, actions: servicosActions } = useServicosMemoria(
    data.servicos,
    marcarSujo,
  );

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
    // Simplificada não suporta Serviços Complementares — remove-os ao trocar.
    if (patch.modelo === "SIMPLIFICADA") servicosActions.limpar();
    setHeader((h) => ({
      ...h,
      ...(patch.clienteId !== undefined ? { clienteId: patch.clienteId } : {}),
      ...(patch.vendedorId !== undefined
        ? { vendedorId: patch.vendedorId }
        : {}),
      ...(patch.nomeProjeto !== undefined
        ? { nomeProjeto: patch.nomeProjeto ?? "" }
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
      nomeProjeto: header.nomeProjeto || null,
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
      servicos: servicos.map((s) => ({
        tipo: s.tipo,
        descricao: s.descricao || null,
        valorProdutos: s.valorProdutos,
        valorServicos: s.valorServicos,
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

  // PDF Apresentação (institucional) — mesma proposta, outro layout.
  const abrirApresentacao = () => {
    window.open(`/propostas/${data.id}/presentation`, "_blank", "noopener");
  };

  // Anexo Contratual (Anexo I do contrato) — mesmo PDF sem preços por item de
  // antes (Sprint 2.10.2); só o rótulo do botão mudou na Sprint 3.1.
  const abrirAnexoContratual = () => {
    window.open(`/propostas/${data.id}/contratual`, "_blank", "noopener");
  };

  // PDF Geral de Produtos (Sprint 4.0.3, ADR-0407) — lista quantitativa de
  // material, para separação e conferência. NÃO passa por `emitirEAbrir`: é uso
  // interno e operacional, disponível em Rascunho e em Emitida. Emitir a
  // proposta por engano ao conferir material seria defeito de negócio.
  const abrirProdutos = () => {
    window.open(`/propostas/${data.id}/produtos`, "_blank", "noopener");
  };

  // Contrato (.docx) — documento jurídico editável no Word (Sprint 3.1). Baixa
  // como anexo; o navegador não renderiza .docx, então window.open dispara o
  // download direto.
  const abrirContrato = () => {
    window.open(`/propostas/${data.id}/contrato`, "_blank", "noopener");
  };

  // Emite a proposta (mesma lógica/método) e abre o documento solicitado.
  // Reutilizado por "PDF Detalhado", "PDF Apresentação", "Emitir Contrato" e
  // "Emitir Anexo Contratual".
  const emitirEAbrir = async (abrir: () => void) => {
    setSaving(true);
    const result = await emitirPropostaAction(data.id);
    setSaving(false);
    if (result.success) {
      toast.success(`Proposta ${data.proposalNumber} emitida.`);
      abrir();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const gerarPdf = () => emitirEAbrir(abrirPdf);
  const gerarApresentacao = () => emitirEAbrir(abrirApresentacao);
  const gerarContrato = () => emitirEAbrir(abrirContrato);
  const gerarAnexoContratual = () => emitirEAbrir(abrirAnexoContratual);

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

  // Aprovação (ADR-0412). Não forka e não toca no conteúdo: só registra que o
  // cliente aprovou ESTA revisão. A invalidação vem depois, sozinha, quando a
  // proposta for salva — não há nada a limpar aqui.
  const aprovar = async () => {
    setAprovando(true);
    const result = await aprovarPropostaAction(data.id);
    if (result.success) {
      toast.success(`Proposta ${data.proposalNumber} aprovada.`);
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setAprovando(false);
  };

  // Correção de engano — volta a EMITIDA, mantendo a emissão. Confirma antes:
  // é raro e desfaz um registro comercial.
  const confirmDesfazer = async () => {
    setAprovando(true);
    const result = await desfazerAprovacaoAction(data.id);
    if (result.success) {
      toast.success("Aprovação desfeita.");
      setDesfazerOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setAprovando(false);
  };

  const semCliente = !header.clienteId;
  const temItens = secoes.some((s) => s.itens.length > 0);
  const podeEmitir =
    data.status === "RASCUNHO" && !dirty && !semCliente && temItens;

  /**
   * Os documentos já emitidos ficam abertos para consulta. Disjunção explícita,
   * NÃO `status !== "RASCUNHO"`: essa forma incluiria CANCELADA e passaria a
   * oferecer documento de proposta cancelada, que hoje não aparece.
   */
  const documentosEmitidos =
    data.status === "EMITIDA" || data.status === "APROVADA";

  // Resumo Financeiro (Sprint 2.9.4): Automação + Serviços Complementares →
  // Total → Desconto (sobre o Total) → Frete → Total Geral. Derivado pela fonte
  // única (`calcularResumoFinanceiro`); nada é persistido. O PDF Comercial
  // (`calcularTotais`, desconto só na Automação) permanece inalterado.
  const simplificada = header.modelo === "SIMPLIFICADA";
  const itensProposta = secoes.flatMap((s) => s.itens);
  const somValor = servicos.find((s) => s.tipo === "SOM")?.valorTotal ?? null;
  const wifiValor = servicos.find((s) => s.tipo === "WIFI")?.valorTotal ?? null;
  const resumo = calcularResumoFinanceiro(
    itensProposta,
    servicos,
    simplificada,
    desconto,
    frete,
  );
  const mostrarResumo = itensProposta.length > 0 || servicos.length > 0;
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
        titleSuffix={
          <Badge
            variant={STATUS_BADGE_VARIANT[data.status]}
            className={STATUS_BADGE_CLASS[data.status]}
          >
            {STATUS_LABEL[data.status]}
          </Badge>
        }
        description={
          readOnly
            ? "Proposta cancelada — somente leitura."
            : "Workspace da proposta — as alterações são gravadas ao clicar em Salvar Alterações."
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
          ) : data.status === "APROVADA" ? (
            <span className="text-green-700 dark:text-green-400">
              {`Aprovada em ${data.revisaoAprovadaEm ? formatDate(data.revisaoAprovadaEm, { hour: "2-digit", minute: "2-digit" }) : "—"}. Ao salvar qualquer alteração, o sistema cria uma nova revisão e a aprovação deixa de valer.`}
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
        simplificada={simplificada}
      />

      {/* Serviços Complementares — ANTES do Resumo Financeiro; ocultos no modelo
          Simplificada (Sprint 2.9.4). */}
      {!simplificada && (
        <ServicosComplementares
          servicos={servicos}
          actions={servicosActions}
          readOnly={readOnly}
        />
      )}

      {/* Resumo Financeiro (tabela financeira ÚNICA) — Automação + Serviços +
          Desconto/Frete (editáveis) → Total Geral. Derivado; não altera o PDF
          Comercial nem o Total da Proposta persistido. */}
      {mostrarResumo && (
        <ResumoFinanceiro
          resumo={resumo}
          som={somValor}
          wifi={wifiValor}
          simplificada={simplificada}
          desconto={desconto}
          onDescontoChange={onDesconto}
          frete={frete}
          onFreteChange={onFrete}
          readOnly={readOnly}
        />
      )}

      {/* Finalização — informações comerciais finais (ADR-0222) */}
      <FinalizacaoProposta
        valores={valores}
        simplificada={header.modelo === "SIMPLIFICADA"}
        readOnly={readOnly}
        onCampo={onCampo}
      />

      {/* Ações na parte inferior — mesmo padrão dos demais módulos. */}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-6">
        {!readOnly && (
          <Button onClick={salvar} disabled={!dirty || saving}>
            <Save className="h-4 w-4" />
            Salvar Alterações
          </Button>
        )}
        {/* Aprovar exige EMITIDA: o cliente só aprova o que lhe foi enviado.
            Bloqueado com alterações pendentes — aprovar um conteúdo prestes a
            mudar confunde, e salvar em seguida invalidaria na hora. */}
        {data.status === "EMITIDA" && (
          <Button
            onClick={aprovar}
            disabled={dirty || aprovando || saving}
            title={
              dirty
                ? "Salve as alterações antes de aprovar."
                : "Registra que o cliente aprovou o conteúdo desta revisão."
            }
          >
            <CheckCircle2 className="h-4 w-4" />
            Aprovar proposta
          </Button>
        )}
        {data.status === "APROVADA" && (
          <Button
            variant="outline"
            onClick={() => setDesfazerOpen(true)}
            disabled={aprovando || saving}
            title="Volta a proposta para Emitida, mantendo o documento."
          >
            <Undo2 className="h-4 w-4" />
            Desfazer aprovação
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
            Gerar PDF Detalhado
          </Button>
        )}
        {documentosEmitidos && (
          <Button variant="outline" onClick={abrirPdf}>
            <FileDown className="h-4 w-4" />
            Abrir PDF Detalhado
          </Button>
        )}
        {/* Único documento com um rótulo só nos dois status: não emite nada. */}
        <Button
          variant="outline"
          onClick={abrirProdutos}
          disabled={!temItens}
          title={
            temItens
              ? "Lista de material com as quantidades somadas de todas as seções."
              : "Adicione ao menos um item para gerar a lista de produtos."
          }
        >
          <FileDown className="h-4 w-4" />
          PDF Geral de Produtos
        </Button>
        {data.status === "RASCUNHO" && !simplificada && (
          <Button
            variant="outline"
            onClick={gerarApresentacao}
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
            Gerar PDF Apresentação
          </Button>
        )}
        {documentosEmitidos && !simplificada && (
          <Button variant="outline" onClick={abrirApresentacao}>
            <FileDown className="h-4 w-4" />
            Abrir PDF Apresentação
          </Button>
        )}
        {data.status === "RASCUNHO" && (
          <Button
            variant="outline"
            onClick={gerarContrato}
            disabled={!podeEmitir || saving}
            title={
              dirty
                ? "Salve as alterações antes de emitir o contrato."
                : podeEmitir
                  ? undefined
                  : "Informe o cliente e adicione ao menos um item para emitir."
            }
          >
            <FileDown className="h-4 w-4" />
            Emitir Contrato
          </Button>
        )}
        {documentosEmitidos && (
          <Button variant="outline" onClick={abrirContrato}>
            <FileDown className="h-4 w-4" />
            Emitir Contrato
          </Button>
        )}
        {data.status === "RASCUNHO" && (
          <Button
            variant="outline"
            onClick={gerarAnexoContratual}
            disabled={!podeEmitir || saving}
            title={
              dirty
                ? "Salve as alterações antes de emitir o anexo."
                : podeEmitir
                  ? undefined
                  : "Informe o cliente e adicione ao menos um item para emitir."
            }
          >
            <FileDown className="h-4 w-4" />
            Emitir Anexo Contratual
          </Button>
        )}
        {documentosEmitidos && (
          <Button variant="outline" onClick={abrirAnexoContratual}>
            <FileDown className="h-4 w-4" />
            Emitir Anexo Contratual
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
      </div>

      <CancelarDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        propostaLabel={`Proposta ${data.proposalNumber}`}
        submitting={saving}
        onConfirm={confirmCancelar}
      />

      <ConfirmDialog
        open={desfazerOpen}
        onOpenChange={setDesfazerOpen}
        title="Desfazer aprovação"
        description="A proposta volta para Emitida e o registro da aprovação desta revisão é removido. O documento emitido é preservado."
        onConfirm={confirmDesfazer}
      />
    </AppPage>
  );
}
