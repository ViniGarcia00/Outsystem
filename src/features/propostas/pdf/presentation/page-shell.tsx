import type { ReactNode } from "react";
import { Page, Text, View } from "@react-pdf/renderer";

import type { Tema } from "../theme";

/**
 * Casca padrão de uma página do PDF Apresentação (A4). Define margens, o título
 * de seção com barra de acento e o corpo. Estrutura preparada para a Sprint 3.1
 * detalhar o design premium de cada página.
 */
export function PresentationPage({
  tema,
  titulo,
  children,
}: {
  tema: Tema;
  titulo?: string;
  children?: ReactNode;
}) {
  return (
    <Page
      size="A4"
      style={{
        fontFamily: tema.fonte,
        fontSize: tema.tamanho.base,
        color: tema.cores.texto,
        paddingVertical: tema.espaco(14),
        paddingHorizontal: tema.espaco(12),
        lineHeight: 1.4,
      }}
    >
      {titulo && (
        <View style={{ marginBottom: tema.espaco(5) }}>
          <View
            style={{
              width: 48,
              height: 3,
              backgroundColor: tema.cores.primaria,
              marginBottom: tema.espaco(2),
            }}
          />
          <Text
            style={{
              fontSize: tema.tamanho.xxl,
              fontWeight: tema.pesos.bold,
              color: tema.cores.primaria,
              letterSpacing: 0.3,
            }}
          >
            {titulo}
          </Text>
        </View>
      )}
      {children}
    </Page>
  );
}

/**
 * Bloco placeholder para as páginas institucionais FIXAS — o conteúdo premium
 * (textos, imagens, cases) será definido na Sprint 3.1.
 */
export function PlaceholderInstitucional({
  tema,
  texto,
}: {
  tema: Tema;
  texto?: string | null;
}) {
  return (
    <Text
      style={{
        fontSize: tema.tamanho.md,
        color: tema.cores.textoSuave,
        lineHeight: 1.6,
      }}
    >
      {texto?.trim()
        ? texto
        : "Conteúdo institucional — layout premium a ser definido na Sprint 3.1."}
    </Text>
  );
}
