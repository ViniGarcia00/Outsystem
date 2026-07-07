"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SecaoDTO } from "@/services/proposta-conteudo.service";

import type { ConteudoActions } from "./conteudo-handlers";
import { SecaoCard } from "./secao-card";

interface Option {
  value: string;
  label: string;
}

/**
 * Editor de conteúdo (seções + produtos) reutilizado pelo workspace definitivo
 * (auto-save via Server Actions) e pelo workspace de criação (em memória). A
 * origem das operações vem de `actions`. Revisão é conceito único — não há
 * rótulo de "revisão do conteúdo" aqui.
 */
export function ConteudoEditor({
  secoes,
  produtos,
  actions,
  readOnly,
  refresh,
}: {
  secoes: SecaoDTO[];
  produtos: Option[];
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
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Conteúdo</h2>

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
              produtos={produtos}
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
    </section>
  );
}
