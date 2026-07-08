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
} as const;

export const FONTE = "Inter";

/** Página 1 — capa: bloco inferior-esquerdo (Nome do Projeto + Nome do Cliente). */
export const CAPA = {
  bloco: { left: 234, top: 404, width: 330 },
  projeto: { fontSize: 15, weight: 700 as const },
  cliente: { fontSize: 12, weight: 400 as const, marginTop: 5 },
};

/** Página 6 — itens: coluna esquerda (lista de seções + produtos, sem qtd/preço). */
export const ITENS = {
  area: { left: 55, top: 100, width: 345 },
  secao: { fontSize: 11, weight: 700 as const, marginBottom: 3, marginTop: 8 },
  produto: { fontSize: 9, weight: 400 as const, marginBottom: 2 },
};

/** Página 8 — investimento: caixa do valor total + caixa do prazo. */
export const INVESTIMENTO = {
  valor: { left: 205, top: 212, width: 550, fontSize: 36, weight: 700 as const },
  prazo: { left: 205, top: 362, width: 550, fontSize: 18, weight: 600 as const },
};

/** Página 9 — pagamento: caixa central. */
export const PAGAMENTO = {
  box: { left: 150, top: 300, width: 660, fontSize: 18, weight: 600 as const },
};
