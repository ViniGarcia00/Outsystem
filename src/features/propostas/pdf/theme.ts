import { FONT_FAMILY } from "./fonts";

/**
 * Tokens de design do documento (A4). As cores de acento (primária/secundária)
 * vêm da Configuração da empresa; o restante é neutro e estável. Centralizar
 * aqui é o que permite novos templates/rebrand sem tocar nos blocos.
 */

export interface Tema {
  cores: {
    primaria: string;
    secundaria: string;
    texto: string;
    textoSuave: string;
    textoClaro: string;
    linha: string;
    fundoSuave: string;
    branco: string;
  };
  fonte: string;
  tamanho: {
    xs: number;
    sm: number;
    base: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  pesos: { regular: 400; medium: 500; semibold: 600; bold: 700 };
  /** Escala de espaçamento (múltiplos de 4pt). */
  espaco: (n: number) => number;
  pagina: {
    paddingHorizontal: number;
    paddingTop: number;
    paddingBottom: number;
  };
}

export function criarTema(corPrimaria: string, corSecundaria: string): Tema {
  return {
    cores: {
      primaria: corPrimaria,
      secundaria: corSecundaria,
      texto: "#1F2937",
      textoSuave: "#6B7280",
      textoClaro: "#9CA3AF",
      linha: "#E5E7EB",
      fundoSuave: "#F3F4F6",
      branco: "#FFFFFF",
    },
    fonte: FONT_FAMILY,
    tamanho: {
      xs: 7.5,
      sm: 8.5,
      base: 9.5,
      md: 11,
      lg: 13,
      xl: 16,
      xxl: 22,
    },
    pesos: { regular: 400, medium: 500, semibold: 600, bold: 700 },
    espaco: (n: number) => n * 4,
    pagina: {
      paddingHorizontal: 40,
      // Reserva vertical para as faixas fixas de cabeçalho e rodapé.
      paddingTop: 94,
      paddingBottom: 54,
    },
  };
}
