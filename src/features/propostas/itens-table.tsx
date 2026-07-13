"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
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
 * Reordenação por **Drag & Drop** (@dnd-kit): arrastar pela alça (⋮⋮) reposiciona
 * o item na seção; a ordem é aplicada na hora e persiste no snapshot ao salvar a
 * proposta (mesma persistência de antes). Arraste apenas pela alça — cliques nos
 * inputs e o scroll da página seguem intactos.
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
  // Sensores: ponteiro (mouse/touch/caneta) com um pequeno limiar para não
  // disparar arraste em cliques; teclado para acessibilidade.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // `arrastando` mantém o cursor "grabbing" por TODO o arraste (não só no
  // :active da alça), cobrindo a área da tabela onde o item se move.
  const [arrastando, setArrastando] = useState(false);

  const onDragEnd = async (event: DragEndEvent) => {
    setArrastando(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const result = await actions.reordenarItens(
      String(active.id),
      String(over.id),
    );
    if (result.success) refresh();
    else toast.error(result.error);
  };

  if (itens.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        Nenhum produto {readOnly ? "nesta proposta" : "ainda"}.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto" style={arrastando ? { cursor: "grabbing" } : undefined}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragStart={() => setArrastando(true)}
        onDragCancel={() => setArrastando(false)}
        onDragEnd={onDragEnd}
      >
        <Table>
          <TableHeader>
            <TableRow>
              {!readOnly && <TableHead className="w-8 sr-only">Ordenar</TableHead>}
              <TableHead>Código</TableHead>
              <TableHead className="w-full min-w-[240px]">Descrição</TableHead>
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
            <SortableContext
              items={itens.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {itens.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  actions={actions}
                  readOnly={readOnly}
                  simplificada={simplificada}
                  refresh={refresh}
                />
              ))}
            </SortableContext>
          </TableBody>
        </Table>
      </DndContext>
    </div>
  );
}

/** Campo monetário editável (máscara BRL); comita ao sair se o valor mudou.
 *  Fonte interna levemente menor (text-xs) para o valor caber por inteiro sem
 *  alargar o campo; altura e alinhamento preservados. */
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
      className="h-8 w-24 text-xs! tabular-nums"
      aria-label={ariaLabel}
    />
  );
}

function ItemRow({
  item,
  actions,
  readOnly,
  simplificada,
  refresh,
}: {
  item: ItemDTO;
  actions: ConteudoActions;
  readOnly: boolean;
  simplificada: boolean;
  refresh: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: readOnly });

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

  const remover = async () => {
    const result = await actions.removerItem(item.id);
    if (result.success) refresh();
    else toast.error(result.error);
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      // Destaque do item em arraste (feedback estilo Trello/Notion/Linear).
      className={
        isDragging ? "relative z-10 bg-muted shadow-lg" : undefined
      }
      data-dragging={isDragging || undefined}
    >
      {!readOnly && (
        <TableCell className="px-1">
          <Button
            ref={setActivatorNodeRef}
            type="button"
            size="icon-sm"
            variant="ghost"
            className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
            aria-label="Arrastar para reordenar"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
        </TableCell>
      )}
      <TableCell className="font-medium whitespace-nowrap">{item.codigo}</TableCell>
      <TableCell className="align-top">
        {/* Descrição privilegiada: usa toda a largura da coluna e permite até
            2 linhas antes do truncamento (line-clamp-2). `whitespace-normal`
            libera a quebra (a célula é nowrap por padrão). Fonte levemente menor
            (13px) só para caber mais texto — leitura preservada. */}
        <span
          className="line-clamp-2 text-[13px] leading-snug whitespace-normal"
          title={item.descricao}
        >
          {item.descricao}
        </span>
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
      <TableCell className="whitespace-nowrap">{item.unidade}</TableCell>
      <TableCell className="whitespace-nowrap">
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
        <TableCell className="whitespace-nowrap">
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
        <TableCell className="tabular-nums whitespace-nowrap">
          {formatCurrency(totalProduto)}
        </TableCell>
      )}
      {!simplificada && (
        <TableCell className="tabular-nums whitespace-nowrap">
          {formatCurrency(totalServico)}
        </TableCell>
      )}
      <TableCell className="font-medium tabular-nums whitespace-nowrap">
        {formatCurrency(totalLinha)}
      </TableCell>
      {!readOnly && (
        <TableCell>
          <div className="flex justify-end">
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
