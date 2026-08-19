import type { PdfItem, PropostaPdfDTO } from "@/services/proposta-pdf.mapper";
import { normalizarBusca } from "@/utils";

/**
 * Consolidação de produtos da Proposta (Sprint 4.0.3, ADR-0407).
 *
 * Soma todas as ocorrências do mesmo produto entre as Seções, produzindo a lista
 * de material da proposta:
 *
 *   Sala:  Interruptor 4 teclas × 2      →   Interruptor 4 teclas × 6
 *   Suíte: Interruptor 4 teclas × 4
 *
 * **É um documento QUANTITATIVO.** Não lê `dto.totais`, `dto.resumo`,
 * `dto.desconto` nem `dto.servicos`: sem preço, sem desconto, sem frete, sem
 * total financeiro e sem os serviços complementares Som/Wi-Fi. A finalidade é
 * separação e conferência de material, não negociação — e por isso nenhum valor
 * oficial da proposta é lido ou recalculado aqui.
 *
 * **Sem separação por Seção**, de propósito: consolidar as Seções é a finalidade.
 *
 * Módulo PURO — sem Prisma, sem IO, sem React.
 */

export interface ProdutoConsolidado {
  codigo: string;
  descricao: string;
  unidade: string;
  /** Soma das quantidades estruturais dos itens equivalentes. */
  quantidade: number;
}

/**
 * Chave de agrupamento.
 *
 * `produtoId` é a identidade **estável**: o SKU é snapshot do item e pode ter
 * sido editado no cadastro depois, o que faria duas linhas do mesmo produto
 * deixarem de se reconhecer. Quando não há vínculo — item legado ou sem cadastro
 * —, o SKU normalizado é o melhor substituto disponível.
 *
 * Descrição **nunca** entra na chave: "Interruptor 4 teclas" e "Interruptor 4
 * teclas branco" são produtos diferentes e não podem se fundir.
 */
function chaveDoItem(item: PdfItem): string {
  return item.produtoId
    ? `id:${item.produtoId}`
    : `codigo:${normalizarBusca(item.codigo)}`;
}

/** Quantidade a 3 casas — mesma precisão de `PropostaItem.quantidade` (12,3). */
const q3 = (valor: number): number => Math.round(valor * 1000) / 1000;

export function consolidarProdutos(
  dto: Pick<PropostaPdfDTO, "secoes">,
): ProdutoConsolidado[] {
  const porChave = new Map<string, ProdutoConsolidado>();

  for (const secao of dto.secoes) {
    for (const item of secao.itens) {
      // `tipo` ausente = item anterior à Sprint 4.0.3, quando só existiam
      // produtos. Tratar como PRODUTO preserva o histórico.
      if (item.tipo === "SERVICO") continue;

      const chave = chaveDoItem(item);
      const atual = porChave.get(chave);

      if (atual) {
        atual.quantidade = q3(atual.quantidade + item.quantidade);
      } else {
        // Código, descrição e unidade vêm da PRIMEIRA ocorrência: são snapshot
        // do item, e a primeira é a mais antiga na ordem da proposta.
        porChave.set(chave, {
          codigo: item.codigo,
          descricao: item.descricao,
          unidade: item.unidade,
          quantidade: q3(item.quantidade),
        });
      }
    }
  }

  // Ordem previsível por SKU e, no empate, por descrição — para que o mesmo
  // conteúdo gere sempre o mesmo documento, independente da ordem dos itens.
  return [...porChave.values()].sort(
    (a, b) =>
      a.codigo.localeCompare(b.codigo, "pt-BR") ||
      a.descricao.localeCompare(b.descricao, "pt-BR"),
  );
}
