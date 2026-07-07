import { Text, View } from "@react-pdf/renderer";

import type { PdfEmpresa } from "@/services/proposta-pdf.mapper";

import type { Tema } from "../theme";

/**
 * Rodapé do documento (faixa FIXA em todas as páginas). Dados institucionais da
 * Outmat (site · telefone · e-mail) à esquerda e "Página X de Y" à direita.
 */
export function PdfRodapeDocumento({
  tema,
  empresa,
}: {
  tema: Tema;
  empresa: PdfEmpresa;
}) {
  const institucional = [empresa.site, empresa.telefone, empresa.email]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <View
      fixed
      style={{
        position: "absolute",
        bottom: 26,
        left: tema.pagina.paddingHorizontal,
        right: tema.pagina.paddingHorizontal,
      }}
    >
      <View
        style={{
          borderTopWidth: 0.5,
          borderTopColor: tema.cores.linha,
          paddingTop: tema.espaco(1.25),
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: tema.fonte,
            fontSize: tema.tamanho.xs,
            color: tema.cores.textoSuave,
          }}
        >
          {institucional || empresa.nome}
        </Text>
        <Text
          style={{
            fontFamily: tema.fonte,
            fontSize: tema.tamanho.xs,
            color: tema.cores.textoSuave,
          }}
          render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages}`
          }
        />
      </View>
    </View>
  );
}
