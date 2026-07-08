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

/** Página 1 — capa: bloco inferior-esquerdo (Nome do Projeto + Nome do Cliente).
 * Alinhado ao bloco "Projeto / Marcos Borges" do template (pixel ~468×825/890). */
export const CAPA = {
  bloco: { left: 234, top: 414, width: 230 },
  projeto: { fontSize: 15, weight: 700 as const },
  cliente: { fontSize: 14, weight: 400 as const, marginTop: 8 },
};

/** Página 6 — itens: coluna esquerda (lista de seções + produtos, sem qtd/preço).
 * Área da tabela do template (pixel x110–790, y190–950). */
export const ITENS = {
  area: { left: 56, top: 96, width: 340 },
  secao: { fontSize: 11, weight: 700 as const, marginBottom: 3, marginTop: 5 },
  produto: { fontSize: 8, weight: 400 as const, marginBottom: 1 },
  mais: { fontSize: 8 },
  /**
   * Orçamento de altura (pt) para a lista NÃO estourar a área e NÃO gerar
   * páginas extras. Quando não cabe, trunca e exibe "... + X itens adicionais".
   * Alturas estimadas por linha (levemente conservadoras — evitam overflow).
   */
  layout: {
    alturaMax: 354,
    alturaProduto: 11,
    alturaSecao: 22,
    alturaSecaoPrimeira: 17,
  },
};

/** Página 8 — investimento: caixa do valor total + caixa do prazo.
 * Caixas cinza centradas (pixel: valor y~390–590; prazo y~660–900). */
export const INVESTIMENTO = {
  valor: { left: 205, top: 224, width: 550, fontSize: 42, weight: 700 as const },
  prazo: { left: 205, top: 378, width: 550, fontSize: 20, weight: 600 as const },
};

/** Página 9 — pagamento: caixa central cinza (pixel x300–1620, y470–810). */
export const PAGAMENTO = {
  box: { left: 150, top: 307, width: 660, fontSize: 22, weight: 600 as const },
};
