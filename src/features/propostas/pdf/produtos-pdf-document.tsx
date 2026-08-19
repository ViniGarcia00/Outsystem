import { Document, Page, Text, View } from "@react-pdf/renderer";

import type { PropostaPdfDTO } from "@/services/proposta-pdf.mapper";

import { PdfCabecalho } from "./blocks/pdf-cabecalho";
import { PdfRodapeDocumento } from "./blocks/pdf-rodape-documento";
import type { ProdutoConsolidado } from "./consolidado";
import { registrarFontes } from "./fonts";
import { formatDate } from "./format";
import { PdfRotulo } from "./primitives";
import { criarTema, type Tema } from "./theme";

/**
 * PDF Geral de Produtos (Sprint 4.0.3, ADR-0407) — quinto documento da Proposta.
 *
 * Lista **quantitativa** de material: uma linha por produto, com todas as
 * ocorrências das Seções já somadas pela função pura `consolidarProdutos`.
 * Serve à separação e conferência de material.
 *
 * **Sem preço, sem total, sem desconto, sem frete, sem Som/Wi-Fi.** O renderer
 * é burro por decisão: recebe a lista pronta e desenha. Não agrupa, não soma,
 * não ordena e não lê nada financeiro do DTO — nem `totais`, nem `resumo`.
 *
 * Reaproveita o cabeçalho e o rodapé fixos dos demais documentos, para que a
 * identidade visual seja a mesma.
 */

/** Larguras da tabela em % — SKU, produto, unidade e quantidade. */
const COL = { sku: "18%", produto: "62%", unidade: "10%", quantidade: "10%" };

function Cabecalho({ tema }: { tema: Tema }) {
  return (
    <View
      fixed
      style={{
        flexDirection: "row",
        backgroundColor: tema.cores.faixaSecao,
        paddingVertical: tema.espaco(1),
        paddingHorizontal: tema.espaco(1.5),
      }}
    >
      <View style={{ width: COL.sku }}>
        <PdfRotulo tema={tema} cor={tema.cores.texto}>
          SKU
        </PdfRotulo>
      </View>
      <View style={{ width: COL.produto }}>
        <PdfRotulo tema={tema} cor={tema.cores.texto}>
          Produto
        </PdfRotulo>
      </View>
      <View style={{ width: COL.unidade }}>
        <PdfRotulo tema={tema} cor={tema.cores.texto}>
          Un.
        </PdfRotulo>
      </View>
      <View style={{ width: COL.quantidade, alignItems: "flex-end" }}>
        <PdfRotulo tema={tema} cor={tema.cores.texto}>
          Qtd.
        </PdfRotulo>
      </View>
    </View>
  );
}

/** Quantidade sem casas supérfluas: 6 vira "6"; 2,5 vira "2,5". */
function formatarQuantidade(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 3,
  }).format(valor);
}

function Linha({
  tema,
  produto,
  zebra,
}: {
  tema: Tema;
  produto: ProdutoConsolidado;
  zebra: boolean;
}) {
  return (
    <View
      wrap={false}
      style={{
        flexDirection: "row",
        paddingVertical: tema.espaco(1),
        paddingHorizontal: tema.espaco(1.5),
        backgroundColor: zebra ? tema.cores.fundoSuave : tema.cores.branco,
        borderBottomWidth: 0.5,
        borderBottomColor: tema.cores.linha,
      }}
    >
      <Text style={{ width: COL.sku }}>{produto.codigo}</Text>
      <Text style={{ width: COL.produto }}>{produto.descricao}</Text>
      <Text style={{ width: COL.unidade }}>{produto.unidade}</Text>
      <Text
        style={{
          width: COL.quantidade,
          textAlign: "right",
          fontWeight: tema.pesos.semibold,
        }}
      >
        {formatarQuantidade(produto.quantidade)}
      </Text>
    </View>
  );
}

export function ProdutosPdfDocument({
  dto,
  produtos,
}: {
  dto: PropostaPdfDTO;
  produtos: ProdutoConsolidado[];
}) {
  registrarFontes();
  const tema = criarTema(dto.empresa.corPrimaria, dto.empresa.corSecundaria);

  return (
    <Document
      title={`Geral de Produtos — Proposta ${dto.numero}`}
      author={dto.empresa.nome}
    >
      <Page
        size="A4"
        style={{
          fontFamily: tema.fonte,
          fontSize: tema.tamanho.base,
          color: tema.cores.texto,
          paddingTop: tema.pagina.paddingTop,
          paddingBottom: tema.pagina.paddingBottom,
          paddingHorizontal: tema.pagina.paddingHorizontal,
          lineHeight: 1.3,
        }}
      >
        <PdfCabecalho
          tema={tema}
          empresa={dto.empresa}
          numero={dto.numero}
          revisao={dto.revisao}
          dataLabel={formatDate(dto.data)}
          titulo="GERAL DE PRODUTOS"
        />
        <PdfRodapeDocumento tema={tema} empresa={dto.empresa} />

        <Text
          style={{
            fontSize: tema.tamanho.sm,
            color: tema.cores.textoSuave,
            marginBottom: tema.espaco(2),
          }}
        >
          {dto.cliente.nome} · Quantidades consolidadas de todas as seções da
          proposta.
        </Text>

        <Cabecalho tema={tema} />

        {produtos.length === 0 ? (
          <View
            style={{
              paddingVertical: tema.espaco(3),
              paddingHorizontal: tema.espaco(1.5),
            }}
          >
            <Text style={{ color: tema.cores.textoSuave }}>
              Esta proposta não possui produtos.
            </Text>
          </View>
        ) : (
          produtos.map((produto, indice) => (
            <Linha
              key={`${produto.codigo}-${indice}`}
              tema={tema}
              produto={produto}
              zebra={indice % 2 === 1}
            />
          ))
        )}

        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            marginTop: tema.espaco(2),
          }}
        >
          <Text
            style={{
              fontSize: tema.tamanho.sm,
              color: tema.cores.textoSuave,
            }}
          >
            {produtos.length} produto{produtos.length === 1 ? "" : "s"} distinto
            {produtos.length === 1 ? "" : "s"}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
