"use client";

import { Check, ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SecaoDTO } from "@/services/proposta-conteudo.service";

import { AdicionarItemDialog } from "./adicionar-item-dialog";
import type { ConteudoActions } from "./conteudo-handlers";
import { ItensTable } from "./itens-table";

interface SecaoCardProps {
  secao: SecaoDTO;
  actions: ConteudoActions;
  readOnly: boolean;
  isFirst: boolean;
  isLast: boolean;
  refresh: () => void;
}

export function SecaoCard({
  secao,
  actions,
  readOnly,
  isFirst,
  isLast,
  refresh,
}: SecaoCardProps) {
  const [editandoNome, setEditandoNome] = useState(false);
  const [nome, setNome] = useState(secao.nome);
  const [addOpen, setAddOpen] = useState(false);
  const [removerOpen, setRemoverOpen] = useState(false);

  const salvarNome = async () => {
    const result = await actions.renomearSecao(secao.id, nome);
    if (result.success) {
      setEditandoNome(false);
      refresh();
    } else {
      toast.error(result.error);
    }
  };

  const mover = async (direcao: "UP" | "DOWN") => {
    const result = await actions.moverSecao(secao.id, direcao);
    if (result.success) refresh();
    else toast.error(result.error);
  };

  const confirmarRemover = async () => {
    const result = await actions.removerSecao(secao.id);
    if (result.success) {
      toast.success(`Seção "${secao.nome}" removida.`);
      refresh();
    } else {
      toast.error(result.error);
    }
    setRemoverOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        {editandoNome ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="max-w-xs"
              autoFocus
            />
            <Button size="icon-sm" variant="ghost" onClick={salvarNome} aria-label="Salvar">
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                setNome(secao.nome);
                setEditandoNome(false);
              }}
              aria-label="Cancelar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight">
              {secao.nome}
            </h3>
            {!readOnly && (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setEditandoNome(true)}
                aria-label="Renomear seção"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}

        {!readOnly && !editandoNome && (
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={isFirst}
              onClick={() => mover("UP")}
              aria-label="Mover seção para cima"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={isLast}
              onClick={() => mover("DOWN")}
              aria-label="Mover seção para baixo"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setRemoverOpen(true)}
              aria-label="Remover seção"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <ItensTable
          itens={secao.itens}
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
        titulo={`Adicionar produto — ${secao.nome}`}
        onAdd={(produto, quantidade, valorUnitario) =>
          actions.adicionarItem(secao.id, produto, quantidade, valorUnitario)
        }
        onAdded={refresh}
      />

      <ConfirmDialog
        open={removerOpen}
        onOpenChange={setRemoverOpen}
        title="Remover seção?"
        description={`A seção "${secao.nome}" e seus produtos serão removidos desta revisão.`}
        confirmLabel="Remover"
        variant="destructive"
        onConfirm={confirmarRemover}
      />
    </Card>
  );
}
