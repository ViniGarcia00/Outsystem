import { Fragment } from "react";
import { Text, View } from "@react-pdf/renderer";

import type { PdfItem, PdfSecao } from "@/services/proposta-pdf.mapper";

import { formatCurrency, formatQuantidade } from "../format";
import type { Tema } from "../theme";

/**
 * Tabela de conteúdo da proposta. **Descrição** ocupa a maior largura; **Código**
 * é discreto (apenas referência). Cabeçalho da tabela FIXO (repete a cada
 * página). Bandas de seção separam os grupos. Regras da Simplificada: sem
 * coluna de serviço; total da linha = Quantidade × Valor Produto.
 */

interface Coluna {
  chave: string;
  titulo: string;
  largura?: number;
  flex?: boolean;
  align: "left" | "right" | "center";
}

function colunas(simplificada: boolean, contratual: boolean): Coluna[] {
  // Contratual (Sprint 2.10.2): sem nenhuma coluna financeira — só o que será
  // entregue (Código, Descrição, Quantidade, Unidade).
  if (contratual) {
    return [
      { chave: "codigo", titulo: "SKU", largura: 50, align: "left" },
      { chave: "descricao", titulo: "Descrição", flex: true, align: "left" },
      { chave: "qtd", titulo: "Qtd", largura: 46, align: "right" },
      { chave: "un", titulo: "UN", largura: 40, align: "center" },
    ];
  }
  if (simplificada) {
    return [
      { chave: "codigo", titulo: "SKU", largura: 44, align: "left" },
      { chave: "descricao", titulo: "Descrição", flex: true, align: "left" },
      { chave: "qtd", titulo: "Qtd", largura: 38, align: "right" },
      { chave: "un", titulo: "UN", largura: 30, align: "center" },
      { chave: "vunit", titulo: "Valor Unitário", largura: 74, align: "right" },
      { chave: "total", titulo: "Total", largura: 74, align: "right" },
    ];
  }
  return [
    { chave: "codigo", titulo: "SKU", largura: 44, align: "left" },
    { chave: "descricao", titulo: "Descrição", flex: true, align: "left" },
    { chave: "qtd", titulo: "Qtd", largura: 38, align: "right" },
    { chave: "un", titulo: "UN", largura: 30, align: "center" },
    { chave: "vprod", titulo: "Valor Produto", largura: 62, align: "right" },
    { chave: "vserv", titulo: "Valor Serviço", largura: 62, align: "right" },
    { chave: "total", titulo: "Total", largura: 66, align: "right" },
  ];
}

function valorCelula(item: PdfItem, chave: string, simplificada: boolean): string {
  switch (chave) {
    case "codigo":
      return item.codigo;
    case "descricao":
      return item.descricao;
    case "qtd":
      return formatQuantidade(item.quantidade);
    case "un":
      return item.unidade;
    case "vprod":
      return formatCurrency(item.valorProduto);
    case "vserv":
      return formatCurrency(item.valorServico);
    case "vunit":
      return formatCurrency(item.valorProduto);
    case "total":
      return formatCurrency(simplificada ? item.totalProduto : item.totalLinha);
    default:
      return "";
  }
}

function celulaStyle(col: Coluna) {
  return {
    ...(col.flex ? { flexGrow: 1, flexBasis: 0 } : { width: col.largura }),
    textAlign: col.align,
    paddingHorizontal: 4,
  } as const;
}

export function PdfConteudoTabela({
  tema,
  secoes,
  simplificada,
  contratual = false,
}: {
  tema: Tema;
  secoes: PdfSecao[];
  simplificada: boolean;
  /** Sprint 2.10.2 — oculta todas as colunas financeiras (PDF Contratual). */
  contratual?: boolean;
}) {
  const cols = colunas(simplificada, contratual);

  return (
    <View style={{ marginTop: tema.espaco(2) }}>
      {/* Cabeçalho da tabela — FIXO: repete no topo de cada página da tabela. */}
      <View
        fixed
        style={{
          flexDirection: "row",
          backgroundColor: tema.cores.primaria,
          paddingVertical: tema.espaco(1.5),
        }}
      >
        {cols.map((col) => (
          <Text
            key={col.chave}
            style={{
              ...celulaStyle(col),
              fontFamily: tema.fonte,
              fontSize: tema.tamanho.xs,
              fontWeight: tema.pesos.semibold,
              color: tema.cores.branco,
              textTransform: "uppercase",
              letterSpacing: 0.3,
            }}
          >
            {col.titulo}
          </Text>
        ))}
      </View>

      {secoes.map((secao, si) => (
        <Fragment key={si}>
          {/* Banda de seção — não fica órfã no fim da página. */}
          <View
            minPresenceAhead={40}
            style={{
              backgroundColor: tema.cores.faixaSecao,
              paddingVertical: tema.espaco(1.25),
              paddingHorizontal: 4,
            }}
          >
            <Text
              style={{
                fontFamily: tema.fonte,
                fontSize: tema.tamanho.sm,
                fontWeight: tema.pesos.semibold,
                color: tema.cores.primaria,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              {secao.nome}
            </Text>
          </View>

          {secao.itens.map((item, ii) => (
            <View
              key={ii}
              wrap={false}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                paddingVertical: tema.espaco(1.25),
                backgroundColor:
                  ii % 2 === 1 ? tema.cores.fundoSuave : tema.cores.branco,
                borderBottomWidth: 0.5,
                borderBottomColor: tema.cores.linha,
              }}
            >
              {cols.map((col) => {
                const isCodigo = col.chave === "codigo";
                return (
                  <Text
                    key={col.chave}
                    style={{
                      ...celulaStyle(col),
                      fontFamily: tema.fonte,
                      fontSize: isCodigo ? tema.tamanho.xs : tema.tamanho.base,
                      // Código em negrito; Descrição (e demais) em peso normal.
                      fontWeight: isCodigo
                        ? tema.pesos.bold
                        : tema.pesos.regular,
                      // Código legível (cor escura); mantém tamanho menor.
                      color: tema.cores.texto,
                    }}
                  >
                    {valorCelula(item, col.chave, simplificada)}
                  </Text>
                );
              })}
            </View>
          ))}
        </Fragment>
      ))}
    </View>
  );
}
