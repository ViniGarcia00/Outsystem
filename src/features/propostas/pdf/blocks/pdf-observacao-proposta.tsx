import { Text, View } from "@react-pdf/renderer";

import { PdfSecaoTitulo } from "../primitives";
import type { Tema } from "../theme";

/**
 * Observações da proposta (campo do cabeçalho) — bloco de texto no PDF. Não
 * renderiza quando vazio.
 */
export function PdfObservacaoProposta({
  tema,
  texto,
}: {
  tema: Tema;
  texto: string | null;
}) {
  if (!texto) return null;

  return (
    <View wrap={false}>
      <PdfSecaoTitulo tema={tema}>Observações da proposta</PdfSecaoTitulo>
      <Text
        style={{
          fontFamily: tema.fonte,
          fontSize: tema.tamanho.base,
          color: tema.cores.texto,
          lineHeight: 1.4,
        }}
      >
        {texto}
      </Text>
    </View>
  );
}
