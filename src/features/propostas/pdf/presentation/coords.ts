/**
 * Posições e cores dos campos variáveis do PDF Apresentação (em PONTOS; página
 * 960×540). Escala template→página = 0.5 (ponto = pixel_1920x1080 × 0.5).
 *
 * ⚠️ PROVISÓRIO: coordenadas estimadas a partir do layout atual dos templates.
 * Ajustar com precisão quando os templates com áreas EM BRANCO forem recebidos
 * (as áreas mantêm o mesmo layout, só sem o conteúdo de exemplo). Centralizado
 * aqui de propósito — o ajuste é só editar números.
 */

/** Cores casadas com a identidade dos templates. */
export const CORES = {
  azul: "#3E7EB8",
  branco: "#FFFFFF",
  suave: "#9AA6B2",
} as const;

export const FONTE = "Inter";

/** Página 1 — capa: bloco inferior-esquerdo.
 * "Projeto" é FIXO no template (base ~y437 pt). O overlay começa ABAIXO dele:
 * Nome do Projeto (azul) e, abaixo, Nome do Cliente (branco). `top` ajustado de
 * 414→446 para não sobrepor a palavra "Projeto"; espaçamento cliente 8→10. */
export const CAPA = {
  bloco: { left: 234, top: 446, width: 230 },
  // Ordem de exibição no bloco: Cliente (linha 1, peso um pouco maior) e, logo
  // abaixo e mais próximo, o Nome do Projeto (linha 2). Ambos em branco.
  // `maxChars`: limita cada campo a no máximo 2 linhas (o @react-pdf 4.x não tem
  // `maxLines`), garantindo que o bloco NUNCA transborde a página → 10 páginas.
  // Calibrado para o pior caso (caracteres largos). Nomes mais longos recebem "…".
  cliente: { fontSize: 14, weight: 500 as const, maxChars: 46 },
  projeto: { fontSize: 15, weight: 500 as const, marginTop: 3, maxChars: 42 },
};

/** Página 6 — itens em ATÉ 3 COLUNAS (cartões de fundo). Cada linha é um
 * cabeçalho de seção OU um produto (quantidade + descrição). Máximo de 13 linhas
 * por coluna; o excedente vira "... + X itens adicionais". Área ampla abaixo do
 * cabeçalho do template. */
export const ITENS = {
  area: { left: 30, top: 116, width: 900 },
  maxColunas: 3,
  maxLinhasColuna: 13,
  gapColuna: 16,
  /** Cartão (fundo) de cada coluna. */
  painel: { bg: "#F2F4F7", radius: 6, padding: 8 },
  /** Cabeçalho de seção (faixa de fundo + texto). */
  secao: {
    fontSize: 11,
    weight: 700 as const,
    bg: "#CBD2DA",
    cor: "#14324B",
    padY: 3,
    padX: 6,
    marginTop: 6,
  },
  /** Produto: quantidade + descrição. */
  produto: {
    fontSize: 10,
    weight: 400 as const,
    cor: "#1F2937",
    qtdWidth: 22,
    padY: 3,
    divisor: "#E1E5EA",
  },
  mais: { fontSize: 9, cor: "#6B7280" },
};

/** Página 8 — investimento: valor (caixa cinza, fonte grande) + prazo (linha
 * "Prazo de Instalação: X" em branco, sobre a área preta abaixo da caixa). */
export const INVESTIMENTO = {
  valor: { left: 205, top: 227, width: 550, fontSize: 62, weight: 700 as const },
  prazo: { left: 205, top: 390, width: 550, fontSize: 20, weight: 600 as const },
};

/** Página 9 — pagamento: caixa central cinza (pixel x300–1620, y470–810).
 * Texto CENTRALIZADO na caixa, fonte grande (40) e peso forte (700) para
 * destaque. */
export const PAGAMENTO = {
  box: { left: 150, top: 292, width: 660, fontSize: 40, weight: 700 as const },
};
