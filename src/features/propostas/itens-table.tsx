"use client";

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CurrencyInput } from "@/components/forms";
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
import { totalProdutoLinha, totalServicoLinha } from "./totais";

/**
 * Grade de produtos. No modelo **Completo** (Comercial): Código · Descrição ·
 * Qtd · UN · Valor Produto · Valor Serviço · Total Produto · Total Serviço ·
 * Total · Ações. No modelo **Simplificada**, as colunas de serviço são ocultadas
 * (apenas visual — os valores de serviço continuam armazenados) e o Total passa
 * a ser Qtd × Valor Produto.
 *
 * Valores monetários usam máscara BRL (R$ 0,00); armazenamento continua numérico.
 * Qtd, Valor Produto e Valor Serviço são editáveis (gravam no snapshot do item,
 * não no cadastro).
 */
export function ItensTable({
  itens,
  actions,
  readOnly,
  refresh,
  simplificada,
}: {
  itens: ItemDTO[];
  actions: ConteudoActions;
  readOnly: boolean;
  refresh: () => void;
  simplificada: boolean;
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
            <TableHead>Valor Produto</TableHead>
            {!simplificada && <TableHead>Valor Serviço</TableHead>}
            {!simplificada && <TableHead>Total Produto</TableHead>}
            {!simplificada && <TableHead>Total Serviço</TableHead>}
            <TableHead>Total</TableHead>
            {!readOnly && <TableHead className="sr-only">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {itens.map((item, index) => (
            <ItemRow
              key={item.id}
              item={item}
              actions={actions}
              readOnly={readOnly}
              simplificada={simplificada}
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

/** Campo monetário editável (máscara BRL); comita ao sair se o valor mudou. */
function EditableMoney({
  valor,
  onCommit,
  ariaLabel,
}: {
  valor: number;
  onCommit: (v: number) => void;
  ariaLabel: string;
}) {
  const [v, setV] = useState(valor);
  return (
    <CurrencyInput
      value={v}
      onChange={setV}
      onBlur={() => {
        if (v !== valor) onCommit(v);
      }}
      className="h-8 w-24"
      aria-label={ariaLabel}
    />
  );
}

function ItemRow({
  item,
  actions,
  readOnly,
  simplificada,
  isFirst,
  isLast,
  refresh,
}: {
  item: ItemDTO;
  actions: ConteudoActions;
  readOnly: boolean;
  simplificada: boolean;
  isFirst: boolean;
  isLast: boolean;
  refresh: () => void;
}) {
  // Quantidade controlada localmente → totais recalculam a cada tecla, sem
  // precisar sair do campo (a memória é atualizada em paralelo).
  const [qtdStr, setQtdStr] = useState(String(item.quantidade));
  const qtdNum = Number(qtdStr);
  const qtdValida = Number.isFinite(qtdNum) && qtdNum > 0;
  const itemLive = {
    quantidade: qtdValida ? qtdNum : item.quantidade,
    valorProduto: item.valorProduto,
    valorServico: item.valorServico,
  };
  const totalProduto = totalProdutoLinha(itemLive);
  const totalServico = totalServicoLinha(itemLive);
  // No modelo Simplificada, o Total é apenas o do produto (serviço oculto).
  const totalLinha = simplificada ? totalProduto : totalProduto + totalServico;

  const onQtd = (valor: string) => {
    setQtdStr(valor);
    const q = Number(valor);
    if (Number.isFinite(q) && q > 0 && q !== item.quantidade) {
      // Atualiza a memória (rodapé/totais) sem remontar a linha nem perder o foco.
      void actions.atualizarQuantidade(item.id, q);
    }
  };

  const salvarValorProduto = async (v: number) => {
    const result = await actions.atualizarValorProduto(item.id, v);
    if (result.success) refresh();
    else toast.error(result.error);
  };

  const salvarValorServico = async (v: number) => {
    const result = await actions.atualizarValorServico(item.id, v);
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
      <TableCell className="font-medium whitespace-nowrap">{item.codigo}</TableCell>
      <TableCell>
        <span className="line-clamp-2 max-w-[220px]">{item.descricao}</span>
      </TableCell>
      <TableCell>
        {readOnly ? (
          item.quantidade
        ) : (
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            min={0.001}
            value={qtdStr}
            onChange={(e) => onQtd(e.target.value)}
            className="h-8 w-16"
            aria-label="Quantidade"
          />
        )}
      </TableCell>
      <TableCell>{item.unidade}</TableCell>
      <TableCell>
        {readOnly ? (
          formatCurrency(item.valorProduto)
        ) : (
          <EditableMoney
            valor={item.valorProduto}
            onCommit={salvarValorProduto}
            ariaLabel="Valor produto"
          />
        )}
      </TableCell>
      {!simplificada && (
        <TableCell>
          {readOnly ? (
            formatCurrency(item.valorServico)
          ) : (
            <EditableMoney
              valor={item.valorServico}
              onCommit={salvarValorServico}
              ariaLabel="Valor serviço"
            />
          )}
        </TableCell>
      )}
      {!simplificada && (
        <TableCell className="tabular-nums">
          {formatCurrency(totalProduto)}
        </TableCell>
      )}
      {!simplificada && (
        <TableCell className="tabular-nums">
          {formatCurrency(totalServico)}
        </TableCell>
      )}
      <TableCell className="font-medium tabular-nums">
        {formatCurrency(totalLinha)}
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
