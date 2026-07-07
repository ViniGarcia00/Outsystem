"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SecaoDTO } from "@/services/proposta-conteudo.service";

import { AdicionarItemDialog } from "./adicionar-item-dialog";
import type { ConteudoActions } from "./conteudo-handlers";
import { ItensTable } from "./itens-table";
import { SecaoCard } from "./secao-card";

/**
 * Editor de conteúdo. No modelo **Comercial**, produtos vivem dentro de seções
 * (cards). No modelo **Simplificada**, produtos entram direto na proposta (lista
 * plana, sem seções). A origem das operações vem de `actions` (servidor ou
 * memória). Revisão é conceito único — sem rótulo de "revisão do conteúdo".
 */
export function ConteudoEditor({
  secoes,
  actions,
  readOnly,
  refresh,
  simplificada,
}: {
  secoes: SecaoDTO[];
  actions: ConteudoActions;
  readOnly: boolean;
  refresh: () => void;
  simplificada: boolean;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Conteúdo</h2>
      {simplificada ? (
        <ConteudoSimplificado
          secoes={secoes}
          actions={actions}
          readOnly={readOnly}
          refresh={refresh}
        />
      ) : (
        <ConteudoComercial
          secoes={secoes}
          actions={actions}
          readOnly={readOnly}
          refresh={refresh}
        />
      )}
    </section>
  );
}

/** Simplificada: lista plana de produtos (sem seções). */
function ConteudoSimplificado({
  secoes,
  actions,
  readOnly,
  refresh,
}: {
  secoes: SecaoDTO[];
  actions: ConteudoActions;
  readOnly: boolean;
  refresh: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const itens = secoes.flatMap((s) => s.itens);

  return (
    <Card>
      <CardContent>
        <ItensTable
          itens={itens}
          actions={actions}
          readOnly={readOnly}
          refresh={refresh}
        />
      </CardContent>
      {!readOnly && (
        <CardFooter>
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Adicionar produto
          </Button>
        </CardFooter>
      )}
      <AdicionarItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        titulo="Adicionar produto"
        onAdd={(produtoId, quantidade, valorUnitario) =>
          actions.adicionarItemAvulso(produtoId, quantidade, valorUnitario)
        }
        onAdded={refresh}
      />
    </Card>
  );
}

/** Comercial: produtos organizados em seções. */
function ConteudoComercial({
  secoes,
  actions,
  readOnly,
  refresh,
}: {
  secoes: SecaoDTO[];
  actions: ConteudoActions;
  readOnly: boolean;
  refresh: () => void;
}) {
  const [novaSecao, setNovaSecao] = useState("");

  const adicionar = async () => {
    const nome = novaSecao.trim();
    if (!nome) return;
    const result = await actions.adicionarSecao(nome);
    if (result.success) {
      setNovaSecao("");
      refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <>
      {secoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma seção ainda.
          {!readOnly && " Adicione a primeira seção abaixo."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {secoes.map((secao, index) => (
            <SecaoCard
              key={secao.id}
              secao={secao}
              actions={actions}
              readOnly={readOnly}
              isFirst={index === 0}
              isLast={index === secoes.length - 1}
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
                adicionar();
              }
            }}
          />
          <Button variant="outline" onClick={adicionar}>
            <Plus className="h-4 w-4" />
            Adicionar seção
          </Button>
        </div>
      )}
    </>
  );
}
