import { Document, Page, Text, View } from "@react-pdf/renderer";

import type { PropostaPdfDTO } from "@/services/proposta-pdf.mapper";

import { PdfAssinaturas } from "./blocks/pdf-assinaturas";
import { PdfCabecalho } from "./blocks/pdf-cabecalho";
import { PdfCliente } from "./blocks/pdf-cliente";
import { PdfConteudoTabela } from "./blocks/pdf-conteudo-tabela";
import { PdfInformacoesComerciais } from "./blocks/pdf-informacoes-comerciais";
import { PdfObservacaoProposta } from "./blocks/pdf-observacao-proposta";
import { PdfObservacoes } from "./blocks/pdf-observacoes";
import { PdfRodapeDocumento } from "./blocks/pdf-rodape-documento";
import { PdfRodapeFinanceiro } from "./blocks/pdf-rodape-financeiro";
import { PdfServicoComplementar } from "./blocks/pdf-servico-complementar";
import { registrarFontes } from "./fonts";
import { formatCurrency, formatDate } from "./format";
import { criarTema } from "./theme";

/**
 * Documento comercial (PDF) — composição do template a partir do
 * {@link PropostaPdfDTO}. É um "template": uma ORDEM de blocos + tema.
 *
 * A MESMA composição serve a dois documentos (Sprint 2.10.2), via `variante`:
 * - **detalhado**: com todos os valores (PDF Detalhado);
 * - **contratual**: oculta só o preço por produto — tabela Código/Descrição/
 *   Qtd/UN + Subtotal Automação; cada projeto (Som/Wi-Fi) exibe seu Subtotal; e
 *   o Resumo Financeiro traz Subtotal Automação → Som → Wi-Fi → Total → Desconto
 *   → Frete → TOTAL DA PROPOSTA (anexo ao contrato). Cabeçalho, rodapé, cliente,
 *   observações e assinaturas são compartilhados; muda a tabela + os subtotais.
 *
 * Cabeçalho e rodapé do documento são FIXOS (repetem em todas as páginas); o
 * cabeçalho da tabela repete a cada página; blocos de totais/observações/
 * assinaturas não quebram entre páginas.
 */
export type VariantePdf = "detalhado" | "contratual";

export function PropostaPdfDocument({
  dto,
  variante = "detalhado",
}: {
  dto: PropostaPdfDTO;
  variante?: VariantePdf;
}) {
  registrarFontes();
  const tema = criarTema(dto.empresa.corPrimaria, dto.empresa.corSecundaria);
  const dataLabel = formatDate(dto.data);
  const contratual = variante === "contratual";
  // Serviços Complementares (Sprint 2.10.1) — seções próprias.
  // Na Simplificada `dto.servicos` é vazio, então nada é renderizado.
  const som = dto.servicos.find((s) => s.tipo === "SOM");
  const wifi = dto.servicos.find((s) => s.tipo === "WIFI");

  return (
    <Document
      title={`${contratual ? "Contrato — Proposta" : "Proposta"} ${dto.numero}`}
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
        {/* Faixas fixas (todas as páginas). */}
        <PdfCabecalho
          tema={tema}
          empresa={dto.empresa}
          numero={dto.numero}
          revisao={dto.revisao}
          dataLabel={dataLabel}
          titulo={contratual ? "ANEXO CONTRATUAL" : "PROPOSTA COMERCIAL"}
        />
        <PdfRodapeDocumento tema={tema} empresa={dto.empresa} />

        {/* Conteúdo fluído. */}
        <PdfCliente
          tema={tema}
          cliente={dto.cliente}
          consultor={dto.consultor}
          dataLabel={dataLabel}
          validadeDias={dto.validadeDias}
          contratual={contratual}
        />

        <PdfConteudoTabela
          tema={tema}
          secoes={dto.secoes}
          simplificada={dto.simplificada}
          contratual={contratual}
        />

        {/* Contratual — a tabela não traz preços por produto; logo abaixo dela
            fecha o bloco Automação com o Subtotal (Produtos + Serviços da
            Automação), vindo do DTO. */}
        {contratual && (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              marginTop: tema.espaco(1.5),
            }}
          >
            <View
              style={{
                width: 268,
                flexDirection: "row",
                justifyContent: "space-between",
                borderTopWidth: 0.5,
                borderTopColor: tema.cores.linha,
                paddingTop: tema.espaco(1),
              }}
            >
              <Text
                style={{
                  fontFamily: tema.fonte,
                  fontSize: tema.tamanho.base,
                  fontWeight: tema.pesos.semibold,
                  color: tema.cores.textoSuave,
                }}
              >
                Subtotal Automação
              </Text>
              <Text
                style={{
                  fontFamily: tema.fonte,
                  fontSize: tema.tamanho.base,
                  fontWeight: tema.pesos.semibold,
                  color: tema.cores.texto,
                }}
              >
                {formatCurrency(dto.resumo.subtotalAutomacao)}
              </Text>
            </View>
          </View>
        )}

        {som && (
          <PdfServicoComplementar
            tema={tema}
            titulo="Projeto Som Ambiente"
            servico={som}
            rotuloValor={contratual ? "Subtotal" : "Valor do Projeto"}
          />
        )}
        {wifi && (
          <PdfServicoComplementar
            tema={tema}
            titulo="Projeto Wi-Fi Premium"
            servico={wifi}
            rotuloValor={contratual ? "Subtotal" : "Valor do Projeto"}
          />
        )}

        <PdfRodapeFinanceiro tema={tema} dto={dto} contratual={contratual} />

        <PdfObservacaoProposta tema={tema} texto={dto.obsProposta} />

        <PdfInformacoesComerciais
          tema={tema}
          formaPagamento={dto.formaPagamento}
          previsaoInstalacao={dto.previsaoInstalacao}
          simplificada={dto.simplificada}
        />

        <PdfObservacoes
          tema={tema}
          obsComerciais={dto.obsComerciais}
          obsTecnicas={dto.obsTecnicas}
        />

        {dto.empresa.textoFinal && (
          <View wrap={false} style={{ marginTop: tema.espaco(4) }}>
            <Text
              style={{
                fontFamily: tema.fonte,
                fontSize: tema.tamanho.sm,
                color: tema.cores.textoSuave,
                lineHeight: 1.4,
              }}
            >
              {dto.empresa.textoFinal}
            </Text>
          </View>
        )}

        <PdfAssinaturas
          tema={tema}
          clienteNome={dto.cliente.nome}
          consultorNome={dto.consultor}
        />
      </Page>
    </Document>
  );
}
