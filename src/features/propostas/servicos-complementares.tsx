"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ServicoDTO, TipoServico } from "@/services/proposta-conteudo.service";

import { ProjetoServicoCard, SERVICO_LABEL } from "./projeto-servico-card";
import type { ServicosActions } from "./servicos-memoria";

/** Ordem fixa dos tipos na seção (botões e cards). */
const TIPOS: TipoServico[] = ["SOM", "WIFI"];

/**
 * Seção "Serviços Complementares" (Sprint 2.9.1). Renderizada como irmã do
 * Conteúdo (Automação) no workspace. Para cada tipo ainda não adicionado mostra
 * o botão "+ Adicionar …"; ao adicionar, o card aparece e o botão sai. Nenhum
 * valor daqui entra nos cálculos da proposta nesta Sprint.
 */
export function ServicosComplementares({
  servicos,
  actions,
  readOnly,
}: {
  servicos: ServicoDTO[];
  actions: ServicosActions;
  readOnly: boolean;
}) {
  const existe = (tipo: TipoServico) => servicos.some((s) => s.tipo === tipo);
  // Cards na ordem fixa (SOM, WIFI), independentemente da ordem de inserção.
  const cards = TIPOS.map((t) => servicos.find((s) => s.tipo === t)).filter(
    (s): s is ServicoDTO => Boolean(s),
  );
  const faltantes = TIPOS.filter((t) => !existe(t));

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">
        Serviços Complementares
      </h2>

      {/* Botões de adição — apenas para os tipos ainda não adicionados. */}
      {!readOnly && faltantes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {faltantes.map((tipo) => (
            <Button
              key={tipo}
              type="button"
              variant="outline"
              onClick={() => actions.adicionar(tipo)}
            >
              <Plus className="h-4 w-4" />
              Adicionar {SERVICO_LABEL[tipo]}
            </Button>
          ))}
        </div>
      )}

      {/* Cards dos serviços já adicionados. */}
      {cards.map((s) => (
        <ProjetoServicoCard
          key={s.tipo}
          tipo={s.tipo}
          descricao={s.descricao}
          valorProdutos={s.valorProdutos}
          valorServicos={s.valorServicos}
          readOnly={readOnly}
          onChange={(patch) => actions.atualizar(s.tipo, patch)}
          onDelete={() => actions.remover(s.tipo)}
        />
      ))}

      {/* Estado vazio (somente leitura, sem serviços). */}
      {readOnly && cards.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum serviço complementar.
        </p>
      )}
    </section>
  );
}
