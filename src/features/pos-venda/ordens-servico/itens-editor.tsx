"use client";

import { Package, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { descricaoDoItem } from "@/features/pos-venda/itens";
import type { ItemOSDTO } from "@/features/pos-venda/tipos";

import {
  AdicionarProdutoDialog,
  type ProdutoEscolhido,
} from "../produto-dialog";
import { salvarItensOSAction } from "./actions";

/**
 * Produtos da Ordem de Serviço (spec §32 e §33).
 *
 * ── POR QUE CARDS E NÃO TABELA ──────────────────────────────────────────────
 * Diferente da Troca, cujo item é aritmética (enviado / esperado / devolvido) e
 * cabe numa linha de tabela, o item da OS carrega **dois textos longos**:
 * o diagnóstico encontrado e a solução aplicada. Espremê-los numa célula
 * tornaria ilegível justamente o conteúdo que a OS existe para registrar.
 *
 * Os dois campos são opcionais DURANTE a execução — o produto é cadastrado
 * antes de ser analisado, que é a ordem em que o trabalho acontece. A exigência
 * é da FINALIZAÇÃO (ADR-0420), e mora no service.
 */

interface LinhaItem {
  id: string | null;
  produtoId: string | null;
  produtoCodigo: string | null;
  produtoDescricao: string | null;
  descricaoManual: string;
  quantidade: number;
  diagnosticoItem: string;
  solucaoItem: string;
}

const doDTO = (i: ItemOSDTO): LinhaItem => ({
  id: i.id,
  produtoId: i.produtoId,
  produtoCodigo: i.produtoCodigo,
  produtoDescricao: i.produtoDescricao,
  descricaoManual: i.descricaoManual ?? "",
  quantidade: i.quantidade,
  diagnosticoItem: i.diagnosticoItem ?? "",
  solucaoItem: i.solucaoItem ?? "",
});

export function ItensOSEditor({
  ordemServicoId,
  itens,
  readOnly,
}: {
  ordemServicoId: string;
  itens: ItemOSDTO[];
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
        quantidade: 1,
        diagnosticoItem: "",
        solucaoItem: "",
      },
    ]);

  async function salvar() {
    setSalvando(true);
    const result = await salvarItensOSAction(ordemServicoId, {
      itens: linhas.map((l) => ({
        id: l.id,
        produtoId: l.produtoId,
        descricaoManual: l.descricaoManual,
        quantidade: l.quantidade,
        diagnosticoItem: l.diagnosticoItem,
        solucaoItem: l.solucaoItem,
      })),
    });

    if (result.success) {
      toast.success("Produtos da ordem de serviço salvos.");
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
            Nenhum produto nesta ordem de serviço.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {linhas.map((linha, indice) => (
            <Card key={linha.id ?? `nova-${indice}`} data-testid="item-os">
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="min-w-0 break-words text-sm font-medium">
                    {descricaoDoItem({
                      produtoCodigo: linha.produtoCodigo,
                      produtoDescricao: linha.produtoDescricao,
                      descricaoManual: linha.descricaoManual,
                    })}
                  </p>
                  <div className="flex items-end gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`os-qtd-${indice}`}>Quantidade</Label>
                      <Input
                        id={`os-qtd-${indice}`}
                        aria-label={`Quantidade ${indice + 1}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        className="w-28 tabular-nums"
                        value={linha.quantidade}
                        disabled={readOnly}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          alterar(indice, {
                            quantidade: Number.isFinite(n) ? n : 1,
                          });
                        }}
                      />
                    </div>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover produto ${indice + 1}`}
                        className="text-destructive hover:text-destructive"
                        onClick={() => remover(indice)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`os-diag-${indice}`}>
                      Diagnóstico encontrado
                    </Label>
                    <Textarea
                      id={`os-diag-${indice}`}
                      aria-label={`Diagnóstico ${indice + 1}`}
                      rows={3}
                      placeholder="Ex.: falha mecânica do mecanismo interno."
                      value={linha.diagnosticoItem}
                      disabled={readOnly}
                      onChange={(e) =>
                        alterar(indice, { diagnosticoItem: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`os-sol-${indice}`}>
                      Solução aplicada
                    </Label>
                    <Textarea
                      id={`os-sol-${indice}`}
                      aria-label={`Solução ${indice + 1}`}
                      rows={3}
                      placeholder="Ex.: substituição do conjunto e testes."
                      value={linha.solucaoItem}
                      disabled={readOnly}
                      onChange={(e) =>
                        alterar(indice, { solucaoItem: e.target.value })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
