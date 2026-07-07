"use client";

import { AlertTriangle, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppPage, PageHeader } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  ModeloProposta,
  SelectOption,
} from "@/services/proposta.service";
import type { SecaoDTO } from "@/services/proposta-conteudo.service";
import type { ProdutoListItem } from "@/services/produto.service";
import { ok, fail } from "@/types";

import { criarPropostaAction } from "./actions";
import { ConteudoEditor } from "./conteudo-editor";
import type { ConteudoActions, Direcao } from "./conteudo-handlers";
import {
  PropostaCabecalho,
  type CabecalhoValores,
} from "./proposta-cabecalho";
import type { CabecalhoPatchValues } from "./schema";

/** Contador de ids temporários (só para a montagem em memória). */
let tempSeq = 0;
const novoId = () => `tmp-${tempSeq++}`;

/** Move um item da lista e renumera `ordem` (0,1,2…). */
function moverNaLista<T extends { id: string; ordem: number }>(
  lista: T[],
  id: string,
  direcao: Direcao,
): T[] {
  const idx = lista.findIndex((x) => x.id === id);
  const swap = direcao === "UP" ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= lista.length) return lista;
  const novo = [...lista];
  [novo[idx], novo[swap]] = [novo[swap], novo[idx]];
  return novo.map((x, i) => ({ ...x, ordem: i }));
}

const CABECALHO_INICIAL: CabecalhoValores = {
  clienteId: null,
  clienteNome: null,
  vendedorId: null,
  modelo: "COMERCIAL" as ModeloProposta,
  validadeDias: 5,
  obsInternas: "",
  obsProposta: "",
};

/**
 * Workspace de CRIAÇÃO — tudo em memória. Nada é gravado até "Criar Proposta",
 * que persiste cabeçalho + seções + produtos numa única transação (ver
 * `criarPropostaCompleta`). Fechar/cancelar antes ⇒ nada existe, nenhum número
 * consumido.
 */
export function NovaPropostaWorkspace({
  produtosData,
  vendedores,
}: {
  produtosData: ProdutoListItem[];
  vendedores: SelectOption[];
}) {
  const router = useRouter();
  const [header, setHeader] = useState<CabecalhoValores>(CABECALHO_INICIAL);
  const [secoes, setSecoes] = useState<SecaoDTO[]>([]);
  const [criando, setCriando] = useState(false);

  const produtosById = useMemo(
    () => new Map(produtosData.map((p) => [p.id, p])),
    [produtosData],
  );
  const produtosOptions = useMemo(
    () =>
      produtosData.map((p) => ({
        value: p.id,
        label: `${p.codigo} — ${p.descricao}`,
      })),
    [produtosData],
  );

  const actions: ConteudoActions = useMemo(
    () => ({
      adicionarSecao: async (nome) => {
        setSecoes((prev) => [
          ...prev,
          { id: novoId(), nome: nome.trim(), ordem: prev.length, itens: [] },
        ]);
        return ok(undefined);
      },
      renomearSecao: async (secaoId, nome) => {
        setSecoes((prev) =>
          prev.map((s) =>
            s.id === secaoId ? { ...s, nome: nome.trim() } : s,
          ),
        );
        return ok(undefined);
      },
      removerSecao: async (secaoId) => {
        setSecoes((prev) =>
          prev
            .filter((s) => s.id !== secaoId)
            .map((s, i) => ({ ...s, ordem: i })),
        );
        return ok(undefined);
      },
      moverSecao: async (secaoId, direcao) => {
        setSecoes((prev) => moverNaLista(prev, secaoId, direcao));
        return ok(undefined);
      },
      adicionarItem: async (secaoId, produtoId, quantidade) => {
        const prod = produtosById.get(produtoId);
        if (!prod) return fail("Produto não encontrado.");
        setSecoes((prev) =>
          prev.map((s) =>
            s.id === secaoId
              ? {
                  ...s,
                  itens: [
                    ...s.itens,
                    {
                      id: novoId(),
                      tipo: "PRODUTO",
                      produtoId,
                      codigo: prod.codigo,
                      descricao: prod.descricao,
                      unidade: prod.unidade,
                      valorProduto: prod.valorProduto,
                      valorServico: prod.valorServico,
                      quantidade,
                      ordem: s.itens.length,
                    },
                  ],
                }
              : s,
          ),
        );
        return ok(undefined);
      },
      atualizarQuantidade: async (itemId, quantidade) => {
        setSecoes((prev) =>
          prev.map((s) => ({
            ...s,
            itens: s.itens.map((it) =>
              it.id === itemId ? { ...it, quantidade } : it,
            ),
          })),
        );
        return ok(undefined);
      },
      removerItem: async (itemId) => {
        setSecoes((prev) =>
          prev.map((s) => ({
            ...s,
            itens: s.itens
              .filter((it) => it.id !== itemId)
              .map((it, i) => ({ ...it, ordem: i })),
          })),
        );
        return ok(undefined);
      },
      moverItem: async (itemId, direcao) => {
        setSecoes((prev) =>
          prev.map((s) =>
            s.itens.some((it) => it.id === itemId)
              ? { ...s, itens: moverNaLista(s.itens, itemId, direcao) }
              : s,
          ),
        );
        return ok(undefined);
      },
    }),
    [produtosById],
  );

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
    }));

  const criar = async () => {
    setCriando(true);
    const result = await criarPropostaAction({
      clienteId: header.clienteId,
      vendedorId: header.vendedorId,
      modelo: header.modelo,
      validadeDias: header.validadeDias,
      obsInternas: header.obsInternas || null,
      obsProposta: header.obsProposta || null,
      secoes: secoes.map((s) => ({
        nome: s.nome,
        itens: s.itens.map((it) => ({
          produtoId: it.produtoId as string,
          quantidade: it.quantidade,
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
            <Button onClick={criar} disabled={criando}>
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
        </CardContent>
      </Card>

      <ConteudoEditor
        secoes={secoes}
        produtos={produtosOptions}
        actions={actions}
        readOnly={false}
        refresh={() => {}}
      />
    </AppPage>
  );
}
