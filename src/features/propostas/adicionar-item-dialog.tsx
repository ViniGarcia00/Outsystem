"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/types";

import { ProdutoAutocomplete } from "./produto-autocomplete";

interface AdicionarItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  /** Persiste o item (em seção específica ou avulso). Retorna o resultado. */
  onAdd: (
    produtoId: string,
    quantidade: number,
    valorUnitario: number,
  ) => Promise<ActionResult>;
  onAdded: () => void;
}

export function AdicionarItemDialog({
  open,
  onOpenChange,
  titulo,
  onAdd,
  onAdded,
}: AdicionarItemDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        {/* Form remonta a cada abertura (Radix desmonta o conteúdo ao fechar),
            então o estado reinicia sozinho — sem efeito de reset. */}
        <ItemForm
          onAdd={onAdd}
          onAdded={onAdded}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ItemForm({
  onAdd,
  onAdded,
  onClose,
}: {
  onAdd: (
    produtoId: string,
    quantidade: number,
    valorUnitario: number,
  ) => Promise<ActionResult>;
  onAdded: () => void;
  onClose: () => void;
}) {
  const [produtoId, setProdutoId] = useState<string | null>(null);
  const [quantidade, setQuantidade] = useState("1");
  const [valor, setValor] = useState("");
  const [saving, setSaving] = useState(false);

  const q = Number(quantidade);
  const v = Number(valor);
  const valido =
    Boolean(produtoId) &&
    Number.isFinite(q) &&
    q > 0 &&
    Number.isFinite(v) &&
    v >= 0;

  const adicionar = async () => {
    if (!produtoId || !valido) return;
    setSaving(true);
    const result = await onAdd(produtoId, q, v);
    if (result.success) {
      toast.success("Produto adicionado.");
      onClose();
      onAdded();
    } else {
      setSaving(false);
      toast.error(result.error);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <ProdutoAutocomplete
          autoFocus
          onSelect={(p) => {
            setProdutoId(p?.id ?? null);
            // Valor unitário pré-preenchido com o preço do cadastro (editável).
            if (p) setValor(String(p.valorProduto));
          }}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="add-qtd">Quantidade</Label>
            <Input
              id="add-qtd"
              type="number"
              inputMode="decimal"
              step="any"
              min={0.001}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-valor">Valor unitário</Label>
            <Input
              id="add-valor"
              type="number"
              inputMode="decimal"
              step="any"
              min={0}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          O valor vale apenas para este item da proposta — não altera o cadastro
          do produto.
        </p>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="button" onClick={adicionar} disabled={!valido || saving}>
          Adicionar
        </Button>
      </DialogFooter>
    </>
  );
}
