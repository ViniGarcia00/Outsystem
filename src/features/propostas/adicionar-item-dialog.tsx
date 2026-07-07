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
import type { ProdutoSuggestion } from "@/services/produto.service";
import type { ActionResult } from "@/types";

import { ProdutoAutocomplete } from "./produto-autocomplete";

interface AdicionarItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  /** Adiciona o item ao rascunho em memória (valores editáveis na proposta). */
  onAdd: (
    produto: ProdutoSuggestion,
    quantidade: number,
    valorProduto: number,
    valorServico: number,
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
    produto: ProdutoSuggestion,
    quantidade: number,
    valorProduto: number,
    valorServico: number,
  ) => Promise<ActionResult>;
  onAdded: () => void;
  onClose: () => void;
}) {
  const [produto, setProduto] = useState<ProdutoSuggestion | null>(null);
  const [quantidade, setQuantidade] = useState("1");
  const [valorProduto, setValorProduto] = useState("");
  const [valorServico, setValorServico] = useState("");
  const [saving, setSaving] = useState(false);

  const q = Number(quantidade);
  const vp = Number(valorProduto);
  const vs = Number(valorServico);
  const valido =
    Boolean(produto) &&
    Number.isFinite(q) &&
    q > 0 &&
    Number.isFinite(vp) &&
    vp >= 0 &&
    Number.isFinite(vs) &&
    vs >= 0;

  const adicionar = async () => {
    if (!produto || !valido) return;
    setSaving(true);
    const result = await onAdd(produto, q, vp, vs);
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
            setProduto(p);
            // Valores pré-preenchidos com o cadastro (editáveis na proposta).
            if (p) {
              setValorProduto(String(p.valorProduto));
              setValorServico(String(p.valorServico));
            }
          }}
        />

        <div className="grid grid-cols-3 gap-4">
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
            <Label htmlFor="add-valor-produto">Valor produto</Label>
            <Input
              id="add-valor-produto"
              type="number"
              inputMode="decimal"
              step="any"
              min={0}
              value={valorProduto}
              onChange={(e) => setValorProduto(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-valor-servico">Valor serviço</Label>
            <Input
              id="add-valor-servico"
              type="number"
              inputMode="decimal"
              step="any"
              min={0}
              value={valorServico}
              onChange={(e) => setValorServico(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Os valores valem apenas para este item da proposta — não alteram o
          cadastro do produto.
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
