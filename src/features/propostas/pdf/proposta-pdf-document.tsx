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
import { formatDate } from "./format";
import { criarTema } from "./theme";

/**
 * Documento comercial (PDF) — composição do template a partir do
 * {@link PropostaPdfDTO}. É um "template": uma ORDEM de blocos + tema.
 *
 * A MESMA composição serve a dois documentos (Sprint 2.10.2), via `variante`:
 * - **detalhado**: com todos os valores (PDF Detalhado);
 * - **contratual**: sem preços por item — tabela só Código/Descrição/Qtd/UN,
 *   seções Som/Wi-Fi sem valor e Resumo Financeiro apenas Desconto/Frete/Total
 *   (anexo ao contrato). Cabeçalho, rodapé, cliente, observações e assinaturas
 *   são compartilhados; só a tabela, as seções e o financeiro mudam.
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
        />

        <PdfConteudoTabela
          tema={tema}
          secoes={dto.secoes}
          simplificada={dto.simplificada}
          contratual={contratual}
        />

        {som && (
          <PdfServicoComplementar
            tema={tema}
            titulo="Projeto Som Ambiente"
            servico={som}
            mostrarValor={!contratual}
          />
        )}
        {wifi && (
          <PdfServicoComplementar
            tema={tema}
            titulo="Projeto Wi-Fi Premium"
            servico={wifi}
            mostrarValor={!contratual}
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
