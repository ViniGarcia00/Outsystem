"use client";

import { AlertTriangle, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { AppPage, PageHeader } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  ModeloProposta,
  SelectOption,
} from "@/services/proposta.service";

import { criarPropostaAction } from "./actions";
import { ConteudoEditor } from "./conteudo-editor";
import { useConteudoMemoria } from "./conteudo-memoria";
import { FinalizacaoProposta } from "./finalizacao-proposta";
import {
  PropostaCabecalho,
  type CabecalhoValores,
} from "./proposta-cabecalho";
import type { CabecalhoPatchValues } from "./schema";
import { DESCONTO_ZERO, type Desconto } from "./totais";

const CABECALHO_INICIAL: CabecalhoValores = {
  clienteId: null,
  clienteNome: null,
  vendedorId: null,
  modelo: "COMERCIAL" as ModeloProposta,
  validadeDias: 5,
  obsInternas: "",
  obsProposta: "",
  // Valores padrão (o usuário pode alterar normalmente) — ADR-0224.
  formaPagamento: "PIX",
  previsaoInstalacao: "3 dias",
  obsComerciais: "",
  obsTecnicas: "",
};

/**
 * Workspace de CRIAÇÃO — tudo em memória. Nada é gravado até "Criar Proposta",
 * que persiste cabeçalho + seções + produtos numa única transação. Fechar/
 * cancelar antes ⇒ nada existe, nenhum número consumido.
 */
export function NovaPropostaWorkspace({
  vendedores,
}: {
  vendedores: SelectOption[];
}) {
  const router = useRouter();
  const [header, setHeader] = useState<CabecalhoValores>(CABECALHO_INICIAL);
  const [desconto, setDesconto] = useState<Desconto>(DESCONTO_ZERO);
  const [frete, setFrete] = useState(0);
  const [criando, setCriando] = useState(false);

  const semMutacao = useCallback(() => {}, []);
  const { secoes, actions } = useConteudoMemoria([], semMutacao);

  const onCampo = (patch: CabecalhoPatchValues) =>
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

  const semCliente = !header.clienteId;

  const criar = async () => {
    if (semCliente) return;
    setCriando(true);
    const result = await criarPropostaAction({
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
      toast.success("Proposta criada.");
      router.push(`/propostas/${result.data.id}`);
    } else {
      setCriando(false);
      toast.error(result.error);
    }
  };

  return (
    <AppPage>
      <PageHeader
        title="Nova proposta"
        description="Monte a proposta; ela só é criada (e recebe número) ao confirmar."
        actions={
          <>
            <Button variant="outline" onClick={() => router.push("/propostas")}>
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button
              onClick={criar}
              disabled={criando || semCliente}
              title={
                semCliente
                  ? "Selecione o cliente para criar a proposta."
                  : undefined
              }
            >
              <Check className="h-4 w-4" />
              Criar Proposta
            </Button>
          </>
        }
      />

      {/* Banner (painel Card) — só durante a criação, logo abaixo do cabeçalho. */}
      <Card className="border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
        <CardContent className="flex items-start gap-3 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              Esta proposta ainda não foi criada. Clique em &ldquo;Criar
              Proposta&rdquo; para salvá-la.
            </p>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
              Enquanto a proposta não for criada, nenhuma informação será gravada
              no banco de dados e nenhum número será reservado.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <PropostaCabecalho
            valores={header}
            vendedores={vendedores}
            readOnly={false}
            onCampo={onCampo}
          />
          {semCliente && (
            <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
              O cliente é obrigatório para criar a proposta.
            </p>
          )}
        </CardContent>
      </Card>

      <ConteudoEditor
        secoes={secoes}
        actions={actions}
        readOnly={false}
        refresh={() => {}}
        simplificada={header.modelo === "SIMPLIFICADA"}
        desconto={desconto}
        onDescontoChange={setDesconto}
        frete={frete}
        onFreteChange={setFrete}
      />

      {/* Finalização — informações comerciais finais (ADR-0222) */}
      <FinalizacaoProposta
        valores={header}
        simplificada={header.modelo === "SIMPLIFICADA"}
        readOnly={false}
        onCampo={onCampo}
      />
    </AppPage>
  );
}
