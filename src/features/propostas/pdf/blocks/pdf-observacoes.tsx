import { Text, View } from "@react-pdf/renderer";

import { PdfRotulo, PdfSecaoTitulo } from "../primitives";
import type { Tema } from "../theme";

/**
 * Bloco 2 — OBSERVAÇÕES: Observações Comerciais e Observações Técnicas, em duas
 * colunas. Separado do bloco de Informações Comerciais. Não renderiza se não
 * houver nada.
 */

function Coluna({
  tema,
  titulo,
  texto,
}: {
  tema: Tema;
  titulo: string;
  texto: string;
}) {
  return (
    <View style={{ flexGrow: 1, flexBasis: 0 }}>
      <PdfRotulo tema={tema}>{titulo}</PdfRotulo>
      <Text
        style={{
          fontFamily: tema.fonte,
          fontSize: tema.tamanho.base,
          color: tema.cores.texto,
          lineHeight: 1.4,
          marginTop: tema.espaco(1),
        }}
      >
        {texto}
      </Text>
    </View>
  );
}

export function PdfObservacoes({
  tema,
  obsComerciais,
  obsTecnicas,
}: {
  tema: Tema;
  obsComerciais: string | null;
  obsTecnicas: string | null;
}) {
  if (!obsComerciais && !obsTecnicas) return null;

  return (
    <View wrap={false}>
      <PdfSecaoTitulo tema={tema}>Observações</PdfSecaoTitulo>
      <View style={{ flexDirection: "row", gap: tema.espaco(6) }}>
        {obsComerciais && (
          <Coluna tema={tema} titulo="Comerciais" texto={obsComerciais} />
        )}
        {obsTecnicas && (
          <Coluna tema={tema} titulo="Técnicas" texto={obsTecnicas} />
        )}
      </View>
    </View>
  );
}
