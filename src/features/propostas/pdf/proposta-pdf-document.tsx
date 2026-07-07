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
import { registrarFontes } from "./fonts";
import { formatDate } from "./format";
import { criarTema } from "./theme";

/**
 * Documento comercial (PDF) — composição do template a partir do
 * {@link PropostaPdfDTO}. É um "template": uma ORDEM de blocos + tema. Módulos
 * futuros (Projeto de Som/Wi-Fi, fotos, novos templates) entram como novos
 * blocos aqui, reaproveitando cabeçalho/rodapé/financeiro/paginação.
 *
 * Cabeçalho e rodapé do documento são FIXOS (repetem em todas as páginas); o
 * cabeçalho da tabela repete a cada página; blocos de totais/observações/
 * assinaturas não quebram entre páginas.
 */
export function PropostaPdfDocument({ dto }: { dto: PropostaPdfDTO }) {
  registrarFontes();
  const tema = criarTema(dto.empresa.corPrimaria, dto.empresa.corSecundaria);
  const dataLabel = formatDate(dto.data);

  return (
    <Document title={`Proposta ${dto.numero}`} author={dto.empresa.nome}>
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
        />

        <PdfRodapeFinanceiro tema={tema} dto={dto} />

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
