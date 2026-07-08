"use client";

import { Trash2 } from "lucide-react";
import { useRef } from "react";

import { CurrencyInput } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TipoServico } from "@/services/proposta-conteudo.service";

import type { ServicoPatch } from "./servicos-memoria";

/** Rótulo do tipo (usado no título do card e nos botões da seção). */
export const SERVICO_LABEL: Record<TipoServico, string> = {
  SOM: "Som Ambiente",
  WIFI: "Wi-Fi Premium",
};

/**
 * Card reutilizável de um Serviço Complementar (Sprint 2.9.1). Mesmo padrão
 * visual do cabeçalho/Finalização: Textarea comita no blur, valores monetários
 * usam `CurrencyInput` (controlado). "Valor Total" é somente leitura e
 * calculado (produtos + serviços). Nenhum cálculo da proposta é afetado.
 */
export function ProjetoServicoCard({
  tipo,
  descricao,
  valorProdutos,
  valorServicos,
  readOnly,
  onChange,
  onDelete,
}: {
  tipo: TipoServico;
  descricao: string;
  valorProdutos: number;
  valorServicos: number;
  readOnly: boolean;
  onChange: (patch: ServicoPatch) => void;
  onDelete: () => void;
}) {
  // Última descrição comitada (evita salvar sem mudança real, como no cabeçalho).
  const ultimaDescricao = useRef(descricao);
  const valorTotal = valorProdutos + valorServicos;

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Projeto {SERVICO_LABEL[tipo]}
          </h3>
          {!readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
              Remover Projeto
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`servico-${tipo}-descricao`}>Descrição</Label>
          <Textarea
            id={`servico-${tipo}-descricao`}
            rows={4}
            defaultValue={descricao}
            disabled={readOnly}
            placeholder="Descreva o escopo do serviço."
            onBlur={(e) => {
              const v = e.target.value;
              if (v !== ultimaDescricao.current) {
                ultimaDescricao.current = v;
                onChange({ descricao: v });
              }
            }}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor={`servico-${tipo}-produtos`}>Valor Produtos</Label>
            <CurrencyInput
              id={`servico-${tipo}-produtos`}
              value={valorProdutos}
              disabled={readOnly}
              onChange={(v) => onChange({ valorProdutos: v })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`servico-${tipo}-servicos`}>Valor Serviços</Label>
            <CurrencyInput
              id={`servico-${tipo}-servicos`}
              value={valorServicos}
              disabled={readOnly}
              onChange={(v) => onChange({ valorServicos: v })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`servico-${tipo}-total`}>Valor Total</Label>
            {/* Somente leitura: mesmo componente/estilo dos demais campos
                monetários (disabled), calculado (produtos + serviços). */}
            <CurrencyInput
              id={`servico-${tipo}-total`}
              value={valorTotal}
              disabled
              readOnly
              tabIndex={-1}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
