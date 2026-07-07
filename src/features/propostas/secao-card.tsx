"use client";

import {
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ItemDTO, SecaoDTO } from "@/services/proposta-conteudo.service";
import { formatCurrency } from "@/utils";

import { AdicionarItemDialog } from "./adicionar-item-dialog";
import type { ConteudoActions } from "./conteudo-handlers";

interface Option {
  value: string;
  label: string;
}

interface SecaoCardProps {
  secao: SecaoDTO;
  produtos: Option[];
  actions: ConteudoActions;
  readOnly: boolean;
  isFirst: boolean;
  isLast: boolean;
  refresh: () => void;
}

export function SecaoCard({
  secao,
  produtos,
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
        {secao.itens.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Nenhum produto nesta seção.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Un.</TableHead>
                  <TableHead>Valor unit.</TableHead>
                  <TableHead>Qtd.</TableHead>
                  {!readOnly && <TableHead className="sr-only">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {secao.itens.map((item, index) => (
                  <ItemRow
                    key={`${item.id}:${item.quantidade}`}
                    item={item}
                    actions={actions}
                    readOnly={readOnly}
                    isFirst={index === 0}
                    isLast={index === secao.itens.length - 1}
                    refresh={refresh}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
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
        secaoId={secao.id}
        secaoNome={secao.nome}
        produtos={produtos}
        actions={actions}
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
  const salvarQtd = async (valor: string) => {
    const q = Number(valor);
    if (!Number.isFinite(q) || q <= 0 || q === item.quantidade) return;
    const result = await actions.atualizarQuantidade(item.id, q);
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
      <TableCell>{item.unidade}</TableCell>
      <TableCell>{formatCurrency(item.valorProduto)}</TableCell>
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
            className="h-8 w-24"
            aria-label="Quantidade"
          />
        )}
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
