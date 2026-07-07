import { Text, View } from "@react-pdf/renderer";

import type { Tema } from "../theme";

/**
 * Área de assinaturas (física, para impressão) — Cliente e Consultor
 * Responsável. Sem assinatura digital; apenas espaço visual. Não quebra entre
 * páginas.
 */

function Campo({
  tema,
  papel,
  nome,
}: {
  tema: Tema;
  papel: string;
  nome: string | null;
}) {
  return (
    <View style={{ flexGrow: 1, flexBasis: 0, alignItems: "center" }}>
      <View
        style={{
          width: "100%",
          borderBottomWidth: 0.75,
          borderBottomColor: tema.cores.texto,
          marginBottom: tema.espaco(1),
        }}
      />
      <Text
        style={{
          fontFamily: tema.fonte,
          fontSize: tema.tamanho.base,
          fontWeight: tema.pesos.semibold,
          color: tema.cores.texto,
        }}
      >
        {papel}
      </Text>
      {nome && (
        <Text
          style={{
            fontFamily: tema.fonte,
            fontSize: tema.tamanho.xs,
            color: tema.cores.textoSuave,
            marginTop: 1,
          }}
        >
          {nome}
        </Text>
      )}
    </View>
  );
}

export function PdfAssinaturas({
  tema,
  clienteNome,
  consultorNome,
}: {
  tema: Tema;
  clienteNome: string | null;
  consultorNome: string | null;
}) {
  return (
    <View wrap={false} style={{ marginTop: tema.espaco(12) }}>
      <View style={{ flexDirection: "row", gap: tema.espaco(12) }}>
        <Campo tema={tema} papel="Cliente" nome={clienteNome} />
        <Campo tema={tema} papel="Consultor Responsável" nome={consultorNome} />
      </View>
    </View>
  );
}
