import { Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";

import type { Tema } from "./theme";

/**
 * Primitivas visuais do PDF — micro-componentes reutilizados pelos blocos.
 * Puras (props → PDF), parametrizadas pelo {@link Tema}.
 */

/** Filete horizontal. */
export function PdfRule({
  tema,
  cor,
  espessura = 0.5,
}: {
  tema: Tema;
  cor?: string;
  espessura?: number;
}) {
  return (
    <View
      style={{
        borderBottomWidth: espessura,
        borderBottomColor: cor ?? tema.cores.linha,
      }}
    />
  );
}

/** Título de seção com barra de acento. Não quebra entre páginas. */
export function PdfSecaoTitulo({
  tema,
  children,
}: {
  tema: Tema;
  children: ReactNode;
}) {
  return (
    <View
      wrap={false}
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginTop: tema.espaco(3),
        marginBottom: tema.espaco(1.5),
      }}
    >
      <View
        style={{
          width: 3,
          height: tema.tamanho.md,
          backgroundColor: tema.cores.primaria,
          marginRight: tema.espaco(1.5),
        }}
      />
      <Text
        style={{
          fontFamily: tema.fonte,
          fontSize: tema.tamanho.md,
          fontWeight: tema.pesos.semibold,
          color: tema.cores.primaria,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

/** Rótulo pequeno em maiúsculas (cabeçalhos de bloco). */
export function PdfRotulo({
  tema,
  children,
  cor,
}: {
  tema: Tema;
  children: ReactNode;
  cor?: string;
}) {
  return (
    <Text
      style={{
        fontFamily: tema.fonte,
        fontSize: tema.tamanho.xs,
        fontWeight: tema.pesos.semibold,
        color: cor ?? tema.cores.textoSuave,
        textTransform: "uppercase",
        letterSpacing: 0.6,
      }}
    >
      {children}
    </Text>
  );
}

/** Par rótulo + valor empilhado (usado no bloco do cliente). */
export function PdfCampo({
  tema,
  rotulo,
  valor,
}: {
  tema: Tema;
  rotulo: string;
  valor: string;
}) {
  return (
    <View style={{ marginBottom: tema.espaco(1) }}>
      <Text
        style={{
          fontFamily: tema.fonte,
          fontSize: tema.tamanho.xs,
          fontWeight: tema.pesos.medium,
          color: tema.cores.textoClaro,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          marginBottom: 1,
        }}
      >
        {rotulo}
      </Text>
      <Text
        style={{
          fontFamily: tema.fonte,
          fontSize: tema.tamanho.base,
          fontWeight: tema.pesos.regular,
          color: tema.cores.texto,
        }}
      >
        {valor}
      </Text>
    </View>
  );
}
