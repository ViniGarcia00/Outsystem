import path from "node:path";

import { Image, Text, View } from "@react-pdf/renderer";

import type { PdfEmpresa } from "@/services/proposta-pdf.mapper";

import type { Tema } from "../theme";

/**
 * Cabeçalho do documento (faixa FIXA repetida em todas as páginas). Limpo:
 * apenas logo + "PROPOSTA COMERCIAL" + número + data (dados institucionais vão
 * ao rodapé). Completo na página 1; compacto nas seguintes.
 */

/**
 * Aceita o logo enviado nas Configurações. A IO já resolve `empresa.logo` para
 * um caminho absoluto de arquivo existente (ou null); http/data também é aceito
 * por robustez. Extensões PNG/JPG (compatíveis com o @react-pdf/renderer).
 */
function logoValido(logo: string | null): logo is string {
  if (!logo) return false;
  return (
    /^https?:\/\//.test(logo) || logo.startsWith("data:") || path.isAbsolute(logo)
  );
}

function Marca({ tema, empresa }: { tema: Tema; empresa: PdfEmpresa }) {
  if (logoValido(empresa.logo)) {
    // @react-pdf `Image` não é um <img> do DOM e não possui prop `alt`.
    // eslint-disable-next-line jsx-a11y/alt-text
    return <Image src={empresa.logo} style={{ height: 34, objectFit: "contain" }} />;
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
      render={({ pageNumber }) =>
        pageNumber === 1 ? (
          <View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
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
        ) : (
          <View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: tema.fonte,
                  fontSize: tema.tamanho.sm,
                  fontWeight: tema.pesos.semibold,
                  color: tema.cores.primaria,
                }}
              >
                {empresa.nome}
              </Text>
              <Text
                style={{
                  fontFamily: tema.fonte,
                  fontSize: tema.tamanho.xs,
                  color: tema.cores.textoSuave,
                }}
              >
                {`PROPOSTA COMERCIAL · ${refLabel}`}
              </Text>
            </View>
            <View
              style={{
                marginTop: tema.espaco(1.5),
                borderBottomWidth: 1,
                borderBottomColor: tema.cores.linha,
              }}
            />
          </View>
        )
      }
    />
  );
}
