"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProdutoAutocomplete } from "@/features/propostas/produto-autocomplete";
// Type-only: NÃO importar valores do service (server) neste client component.
import type { ProdutoSuggestion } from "@/services/produto.service";

/**
 * Escolha de um produto para a grade — Troca ou OS (Sprint 4.6).
 *
 * Duas origens, e só duas (spec §9 e §32):
 *
 *   CADASTRO → guarda o `produtoId` REAL. É o que torna possível, no futuro,
 *              analisar defeito recorrente por produto, e é o que a criação
 *              semiautomática da OS copia.
 *   MANUAL   → "Outro / Produto não cadastrado", com descrição obrigatória.
 *              Existe porque a peça que volta nem sempre está no catálogo — a
 *              fechadura antiga do hall, por exemplo, que a Outmat nunca vendeu.
 *
 * O `ProdutoAutocomplete` é reusado de Propostas: é o mesmo cadastro e a mesma
 * UX, e um segundo autocomplete de produto seria uma cópia para manter em dia.
 *
 * O componente não grava nada — devolve a escolha e fecha. Quem monta a linha e
 * decide quantidades é a grade.
 */

export interface ProdutoEscolhido {
  produtoId: string | null;
  codigo: string | null;
  descricao: string | null;
  /** Preenchida apenas na origem MANUAL. */
  descricaoManual: string;
}

type Origem = "CADASTRO" | "MANUAL";

export function AdicionarProdutoDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (escolhido: ProdutoEscolhido) => void;
}) {
  const [origem, setOrigem] = useState<Origem>("CADASTRO");
  const [produto, setProduto] = useState<ProdutoSuggestion | null>(null);
  const [descricaoManual, setDescricaoManual] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function limpar() {
    setOrigem("CADASTRO");
    setProduto(null);
    setDescricaoManual("");
    setErro(null);
  }

  /**
   * Limpa ao FECHAR, num handler de evento — não num efeito.
   *
   * Resetar na abertura exigiria `setState` dentro de `useEffect`, que o lint
   * do projeto barra (cascading renders). Fechar cobre todos os caminhos de
   * saída — Esc, clique fora, "Cancelar" e "Adicionar" —, então o diálogo nunca
   * reabre mostrando a escolha anterior.
   */
  function aoMudarAbertura(aberto: boolean) {
    if (!aberto) limpar();
    onOpenChange(aberto);
  }

  function confirmar() {
    if (origem === "CADASTRO") {
      if (!produto) {
        setErro("Selecione um produto do cadastro.");
        return;
      }
      onConfirm({
        produtoId: produto.id,
        codigo: produto.codigo,
        descricao: produto.descricao,
        descricaoManual: "",
      });
    } else {
      if (!descricaoManual.trim()) {
        setErro("Informe a descrição do produto.");
        return;
      }
      onConfirm({
        produtoId: null,
        codigo: null,
        descricao: null,
        descricaoManual: descricaoManual.trim(),
      });
    }
    aoMudarAbertura(false);
  }

  return (
    <Dialog open={open} onOpenChange={aoMudarAbertura}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar produto</DialogTitle>
          <DialogDescription>
            Escolha um produto do cadastro ou descreva um item que não está
            cadastrado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="origem-produto">Origem</Label>
            <Select
              value={origem}
              onValueChange={(v) => {
                setOrigem(v as Origem);
                setErro(null);
              }}
            >
              <SelectTrigger id="origem-produto" aria-label="Origem">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CADASTRO">Produto do cadastro</SelectItem>
                <SelectItem value="MANUAL">
                  Outro / Produto não cadastrado
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {origem === "CADASTRO" ? (
            <ProdutoAutocomplete
              onSelect={(p) => {
                setProduto(p);
                setErro(null);
              }}
            />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="descricao-manual">Descrição</Label>
              <Input
                id="descricao-manual"
                value={descricaoManual}
                placeholder="Ex.: Fechadura antiga do hall, sem etiqueta"
                onChange={(e) => {
                  setDescricaoManual(e.target.value);
                  setErro(null);
                }}
              />
            </div>
          )}

          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => aoMudarAbertura(false)}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={confirmar}>
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
