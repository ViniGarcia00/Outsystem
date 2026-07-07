"use client";

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ItemDTO } from "@/services/proposta-conteudo.service";
import { formatCurrency } from "@/utils";

import type { ConteudoActions } from "./conteudo-handlers";

/**
 * Grade de produtos: Código · Descrição · Qtd · UN · Valor Unitário · Total.
 * Qtd e Valor Unitário são editáveis (auto-save); o Total (Qtd × Valor Unitário)
 * é apenas visual. Reutilizada por Comercial (dentro do SecaoCard) e Simplificada
 * (lista plana). O valor editado grava no snapshot do item, não no cadastro.
 */
export function ItensTable({
  itens,
  actions,
  readOnly,
  refresh,
}: {
  itens: ItemDTO[];
  actions: ConteudoActions;
  readOnly: boolean;
  refresh: () => void;
}) {
  if (itens.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        Nenhum produto {readOnly ? "nesta proposta" : "ainda"}.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Qtd.</TableHead>
            <TableHead>UN</TableHead>
            <TableHead>Valor Unitário</TableHead>
            <TableHead>Total</TableHead>
            {!readOnly && <TableHead className="sr-only">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {itens.map((item, index) => (
            <ItemRow
              key={`${item.id}:${item.quantidade}:${item.valorProduto}`}
              item={item}
              actions={actions}
              readOnly={readOnly}
              isFirst={index === 0}
              isLast={index === itens.length - 1}
              refresh={refresh}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ItemRow({
  item,
  actions,
  readOnly,
  isFirst,
  isLast,
  refresh,
}: {
  item: ItemDTO;
  actions: ConteudoActions;
  readOnly: boolean;
  isFirst: boolean;
  isLast: boolean;
  refresh: () => void;
}) {
  const total = item.quantidade * item.valorProduto;

  const salvarQtd = async (valor: string) => {
    const q = Number(valor);
    if (!Number.isFinite(q) || q <= 0 || q === item.quantidade) return;
    const result = await actions.atualizarQuantidade(item.id, q);
    if (result.success) refresh();
    else toast.error(result.error);
  };

  const salvarValor = async (valor: string) => {
    const v = Number(valor);
    if (!Number.isFinite(v) || v < 0 || v === item.valorProduto) return;
    const result = await actions.atualizarValorUnitario(item.id, v);
    if (result.success) refresh();
    else toast.error(result.error);
  };

  const mover = async (direcao: "UP" | "DOWN") => {
    const result = await actions.moverItem(item.id, direcao);
    if (result.success) refresh();
    else toast.error(result.error);
  };

  const remover = async () => {
    const result = await actions.removerItem(item.id);
    if (result.success) refresh();
    else toast.error(result.error);
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{item.codigo}</TableCell>
      <TableCell>{item.descricao}</TableCell>
      <TableCell>
        {readOnly ? (
          item.quantidade
        ) : (
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            min={0.001}
            defaultValue={item.quantidade}
            onBlur={(e) => salvarQtd(e.target.value)}
            className="h-8 w-20"
            aria-label="Quantidade"
          />
        )}
      </TableCell>
      <TableCell>{item.unidade}</TableCell>
      <TableCell>
        {readOnly ? (
          formatCurrency(item.valorProduto)
        ) : (
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            defaultValue={item.valorProduto}
            onBlur={(e) => salvarValor(e.target.value)}
            className="h-8 w-28"
            aria-label="Valor unitário"
          />
        )}
      </TableCell>
      <TableCell className="font-medium tabular-nums">
        {formatCurrency(total)}
      </TableCell>
      {!readOnly && (
        <TableCell>
          <div className="flex justify-end gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={isFirst}
              onClick={() => mover("UP")}
              aria-label="Mover item para cima"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={isLast}
              onClick={() => mover("DOWN")}
              aria-label="Mover item para baixo"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={remover}
              aria-label="Remover item"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}
