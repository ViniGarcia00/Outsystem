"use client";

import { Package, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { descricaoDoItem, pendenteDoItem } from "@/features/pos-venda/itens";
import type { ItemTrocaDTO } from "@/features/pos-venda/tipos";

import { AdicionarProdutoDialog, type ProdutoEscolhido } from "../produto-dialog";
import { salvarItensTrocaAction } from "./actions";

/**
 * Grade de produtos da Troca (spec §22).
 *
 * Colunas: Produto, Enviado, Esperado retorno, Devolvido, Pendente, Ações.
 *
 * **Pendente é DERIVADO** — `pendenteDoItem`, do módulo puro. Não existe coluna
 * no banco e não há soma feita aqui.
 *
 * ── POR QUE UM "SALVAR PRODUTOS" PRÓPRIO ────────────────────────────────────
 * A grade tem botão próprio, separado do "Salvar alterações" do cabeçalho. É
 * deliberado: quem lança uma devolução parcial está fazendo UMA coisa — anotar
 * que 5 dos 7 voltaram — e não deveria arrastar junto uma edição de status pela
 * metade que estivesse aberta no formulário acima. As duas Server Actions são
 * independentes, e o service reconcilia os itens por id (nunca recria a grade).
 *
 * O aviso de "devolvida acima da esperada" aparece na hora, na própria linha. A
 * recusa de verdade continua sendo do service — isto é cortesia, não guarda.
 */

/** Linha em edição. `id` nulo = ainda não gravada. */
interface LinhaItem {
  id: string | null;
  produtoId: string | null;
  produtoCodigo: string | null;
  produtoDescricao: string | null;
  descricaoManual: string;
  quantidadeEnviada: number;
  quantidadeEsperadaRetorno: number;
  quantidadeDevolvida: number;
}

const doDTO = (i: ItemTrocaDTO): LinhaItem => ({
  id: i.id,
  produtoId: i.produtoId,
  produtoCodigo: i.produtoCodigo,
  produtoDescricao: i.produtoDescricao,
  descricaoManual: i.descricaoManual ?? "",
  quantidadeEnviada: i.quantidadeEnviada,
  quantidadeEsperadaRetorno: i.quantidadeEsperadaRetorno,
  quantidadeDevolvida: i.quantidadeDevolvida,
});

export function ItensTrocaEditor({
  trocaId,
  itens,
  readOnly,
}: {
  trocaId: string;
  itens: ItemTrocaDTO[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [linhas, setLinhas] = useState<LinhaItem[]>(() => itens.map(doDTO));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const alterar = (indice: number, patch: Partial<LinhaItem>) =>
    setLinhas((atual) =>
      atual.map((l, i) => (i === indice ? { ...l, ...patch } : l)),
    );

  const remover = (indice: number) =>
    setLinhas((atual) => atual.filter((_, i) => i !== indice));

  const adicionar = (escolhido: ProdutoEscolhido) =>
    setLinhas((atual) => [
      ...atual,
      {
        id: null,
        produtoId: escolhido.produtoId,
        produtoCodigo: escolhido.codigo,
        produtoDescricao: escolhido.descricao,
        descricaoManual: escolhido.descricaoManual,
        quantidadeEnviada: 1,
        quantidadeEsperadaRetorno: 1,
        quantidadeDevolvida: 0,
      },
    ]);

  async function salvar() {
    setSalvando(true);
    const result = await salvarItensTrocaAction(trocaId, {
      itens: linhas.map((l) => ({
        id: l.id,
        produtoId: l.produtoId,
        descricaoManual: l.descricaoManual,
        quantidadeEnviada: l.quantidadeEnviada,
        quantidadeEsperadaRetorno: l.quantidadeEsperadaRetorno,
        quantidadeDevolvida: l.quantidadeDevolvida,
      })),
    });

    if (result.success) {
      toast.success("Produtos da troca salvos.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setSalvando(false);
  }

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Adicionar produto
          </Button>
          <Button type="button" onClick={salvar} disabled={salvando}>
            <Save className="h-4 w-4" />
            {salvando ? "Salvando…" : "Salvar produtos"}
          </Button>
        </div>
      )}

      {linhas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed p-8 text-center">
          <Package className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhum produto na troca. Adicione o que foi enviado e o que se espera
            de volta.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="w-28">Enviado</TableHead>
                <TableHead className="w-32">Esperado retorno</TableHead>
                <TableHead className="w-28">Devolvido</TableHead>
                <TableHead className="w-24">Pendente</TableHead>
                <TableHead className="w-16">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((linha, indice) => {
                const pendente = pendenteDoItem(linha);
                const excedeu =
                  linha.quantidadeDevolvida > linha.quantidadeEsperadaRetorno;
                return (
                  <TableRow key={linha.id ?? `nova-${indice}`} data-testid="linha-item">
                    <TableCell className="min-w-56">
                      <span className="break-words text-sm">
                        {descricaoDoItem({
                          produtoCodigo: linha.produtoCodigo,
                          produtoDescricao: linha.produtoDescricao,
                          descricaoManual: linha.descricaoManual,
                        })}
                      </span>
                      {excedeu && (
                        <p className="mt-1 text-xs text-destructive">
                          Devolvido não pode ser maior que o esperado.
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <QuantidadeCell
                        rotulo={`Enviado ${indice + 1}`}
                        valor={linha.quantidadeEnviada}
                        disabled={readOnly}
                        onChange={(v) =>
                          alterar(indice, { quantidadeEnviada: v })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <QuantidadeCell
                        rotulo={`Esperado retorno ${indice + 1}`}
                        valor={linha.quantidadeEsperadaRetorno}
                        disabled={readOnly}
                        onChange={(v) =>
                          alterar(indice, { quantidadeEsperadaRetorno: v })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <QuantidadeCell
                        rotulo={`Devolvido ${indice + 1}`}
                        valor={linha.quantidadeDevolvida}
                        disabled={readOnly}
                        onChange={(v) =>
                          alterar(indice, { quantidadeDevolvida: v })
                        }
                      />
                    </TableCell>
                    <TableCell className="tabular-nums" data-testid="pendente">
                      {pendente}
                    </TableCell>
                    <TableCell>
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remover produto ${indice + 1}`}
                          className="text-destructive hover:text-destructive"
                          onClick={() => remover(indice)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AdicionarProdutoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={adicionar}
      />
    </div>
  );
}

/**
 * Célula de quantidade. `<input type="number">` com `min=0`, e o valor volta ao
 * formulário como NÚMERO — campo vazio vira 0, não `NaN`.
 *
 * O `aria-label` numerado é o que dá ao teste (e ao leitor de tela) um jeito de
 * mirar uma célula específica sem depender da posição na tabela.
 */
function QuantidadeCell({
  rotulo,
  valor,
  disabled,
  onChange,
}: {
  rotulo: string;
  valor: number;
  disabled: boolean;
  onChange: (valor: number) => void;
}) {
  return (
    <>
      <Label className="sr-only" htmlFor={`qtd-${rotulo}`}>
        {rotulo}
      </Label>
      <Input
        id={`qtd-${rotulo}`}
        aria-label={rotulo}
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        className="w-full tabular-nums"
        value={valor}
        disabled={disabled}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
      />
    </>
  );
}
