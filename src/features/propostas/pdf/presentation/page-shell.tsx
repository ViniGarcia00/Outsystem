import type { ReactNode } from "react";
import { Image, Page } from "@react-pdf/renderer";

/**
 * Dimensões da página do PDF Apresentação — 16:9 landscape (PowerPoint padrão:
 * 960×540 pt). Os templates são 1920×1080 px, então a escala template→página é
 * **0.5** (ponto = pixel × 0.5). Ver `coords.ts`.
 */
export const PAGE_W = 960;
export const PAGE_H = 540;

/**
 * Casca de uma página do PDF Apresentação: o template é o **plano de fundo**
 * (página inteira) e os campos variáveis (quando houver) são sobrepostos por
 * posicionamento absoluto. Nenhuma página é redesenhada — apenas o fundo + os
 * dados.
 */
export function PresentationPage({
  background,
  children,
}: {
  /** Data URI do template gráfico (plano de fundo da página). */
  background: string;
  children?: ReactNode;
}) {
  return (
    <Page size={[PAGE_W, PAGE_H]}>
      {/* Fundo full-page (o template gráfico). @react-pdf Image não tem `alt`. */}
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image
        src={background}
        style={{ position: "absolute", top: 0, left: 0, width: PAGE_W, height: PAGE_H }}
      />
      {children}
    </Page>
  );
}
