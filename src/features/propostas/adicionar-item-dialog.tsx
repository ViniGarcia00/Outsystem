"use client";

import { useState } from "react";
import { toast } from "sonner";

import { CurrencyInput } from "@/components/forms";
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
  /** Exibe o campo Valor serviço (Simplificada oculta; o valor segue no snapshot). */
  mostrarServico: boolean;
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
  mostrarServico,
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
          mostrarServico={mostrarServico}
          onAdd={onAdd}
          onAdded={onAdded}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ItemForm({
  mostrarServico,
  onAdd,
  onAdded,
  onClose,
}: {
  mostrarServico: boolean;
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
  const [valorProduto, setValorProduto] = useState(0);
  const [valorServico, setValorServico] = useState(0);
  const [saving, setSaving] = useState(false);

  const q = Number(quantidade);
  const valido =
    Boolean(produto) &&
    Number.isFinite(q) &&
    q > 0 &&
    valorProduto >= 0 &&
    valorServico >= 0;

  const adicionar = async () => {
    if (!produto || !valido) return;
    setSaving(true);
    // Mesmo na Simplificada o valorServico do cadastro é preservado no snapshot.
    const result = await onAdd(produto, q, valorProduto, valorServico);
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
              setValorProduto(p.valorProduto);
              setValorServico(p.valorServico);
            }
          }}
        />

        <div className={mostrarServico ? "grid grid-cols-3 gap-4" : "grid grid-cols-2 gap-4"}>
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
            <CurrencyInput
              id="add-valor-produto"
              value={valorProduto}
              onChange={setValorProduto}
            />
          </div>
          {mostrarServico && (
            <div className="space-y-2">
              <Label htmlFor="add-valor-servico">Valor serviço</Label>
              <CurrencyInput
                id="add-valor-servico"
                value={valorServico}
                onChange={setValorServico}
              />
            </div>
          )}
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
