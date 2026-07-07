import { Image, Text, View } from "@react-pdf/renderer";

import type { PdfEmpresa } from "@/services/proposta-pdf.mapper";

import type { Tema } from "../theme";

/**
 * Cabeçalho do documento (faixa FIXA repetida em todas as páginas). Limpo:
 * logo no canto superior esquerdo + "PROPOSTA COMERCIAL" + número + data
 * (dados institucionais vão ao rodapé).
 *
 * IMPORTANTE: o cabeçalho é ESTÁTICO (sem prop `render`). O @react-pdf só
 * pré-carrega/embute imagens que estão na árvore estática; imagens dentro de um
 * callback `render` não são embutidas (por isso o logo não aparecia).
 */

/**
 * Logo enviado nas Configurações. A IO resolve `empresa.logo` para um DATA URI
 * (base64) do arquivo, ou null. http(s) também é aceito por robustez.
 */
function logoValido(logo: string | null): logo is string {
  if (!logo) return false;
  return /^https?:\/\//.test(logo) || logo.startsWith("data:");
}

function Marca({ tema, empresa }: { tema: Tema; empresa: PdfEmpresa }) {
  if (logoValido(empresa.logo)) {
    return (
      // @react-pdf `Image` não é um <img> do DOM e não possui prop `alt`.
      // eslint-disable-next-line jsx-a11y/alt-text
      <Image
        src={empresa.logo}
        style={{ height: 40, maxWidth: 180, objectFit: "contain" }}
      />
    );
  }
  return (
    <Text
      style={{
        fontFamily: tema.fonte,
        fontSize: tema.tamanho.xl,
        fontWeight: tema.pesos.bold,
        color: tema.cores.primaria,
        letterSpacing: 0.5,
      }}
    >
      {empresa.nome}
    </Text>
  );
}

export function PdfCabecalho({
  tema,
  empresa,
  numero,
  revisao,
  dataLabel,
}: {
  tema: Tema;
  empresa: PdfEmpresa;
  numero: number;
  revisao: number | null;
  dataLabel: string;
}) {
  const refLabel = `Nº ${numero}${revisao != null ? ` · Rev.${revisao}` : ""}`;

  return (
    <View
      fixed
      style={{
        position: "absolute",
        top: 28,
        left: tema.pagina.paddingHorizontal,
        right: tema.pagina.paddingHorizontal,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        {/* Logo no canto superior esquerdo. */}
        <Marca tema={tema} empresa={empresa} />
        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              fontFamily: tema.fonte,
              fontSize: tema.tamanho.lg,
              fontWeight: tema.pesos.bold,
              color: tema.cores.texto,
              letterSpacing: 1.2,
            }}
          >
            PROPOSTA COMERCIAL
          </Text>
          <Text
            style={{
              fontFamily: tema.fonte,
              fontSize: tema.tamanho.sm,
              fontWeight: tema.pesos.semibold,
              color: tema.cores.primaria,
              marginTop: 2,
            }}
          >
            {refLabel}
          </Text>
          <Text
            style={{
              fontFamily: tema.fonte,
              fontSize: tema.tamanho.xs,
              color: tema.cores.textoSuave,
              marginTop: 1,
            }}
          >
            {dataLabel}
          </Text>
        </View>
      </View>
      <View
        style={{
          marginTop: tema.espaco(2),
          borderBottomWidth: 2,
          borderBottomColor: tema.cores.primaria,
        }}
      />
    </View>
  );
}
