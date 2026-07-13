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
  /** Texto de corpo sobre áreas claras (ex.: descrição dos slides de serviço). */
  texto: "#1F2937",
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
  /** Cabeçalho de seção (faixa de fundo + texto). Fonte aumentada na 2.10.3
   *  (slide 06 estava com a fonte pequena) — alinhamento preservado. */
  secao: {
    fontSize: 13,
    weight: 700 as const,
    bg: "#CBD2DA",
    cor: "#14324B",
    padY: 3,
    padX: 6,
    marginTop: 6,
  },
  /** Produto: quantidade + descrição. Fonte aumentada na 2.10.3; `qtdWidth`
   *  acompanha para manter o alinhamento da coluna de quantidade. */
  produto: {
    fontSize: 12,
    weight: 400 as const,
    cor: "#1F2937",
    qtdWidth: 24,
    padY: 3,
    divisor: "#E1E5EA",
  },
  mais: { fontSize: 10, cor: "#6B7280" },
};

/** Slide 08 — **Investimento da Automação**: valor único (caixa cinza, fonte
 * grande) + prazo ("Prazo de Instalação: X"). Representa EXCLUSIVAMENTE a
 * Automação (nunca Som/Wi-Fi). Layout homologado — inalterado. */
export const INVESTIMENTO = {
  valor: { left: 205, top: 280, width: 550, fontSize: 62, weight: 700 as const },
  /** Prazo de instalação — usado agora no SLIDE 11 (mesma posição de antes). */
  prazo: { left: 205, top: 390, width: 550, fontSize: 20, weight: 600 as const },
};

/** Slide 11 — **Investimento Total**: valor total (Total Geral, já com desconto)
 * dentro do bloco; e, QUANDO houver desconto, o valor inicial (sem desconto)
 * RISCADO acima do bloco. Coordenadas PROVISÓRIAS. */
export const INVESTIMENTO_TOTAL = {
  valor: { left: 205, top: 228, width: 550, fontSize: 62, weight: 700 as const },
  /** Valor inicial (sem desconto), riscado (branco), acima do bloco — só quando há desconto. */
  original: { left: 205, top: 150, width: 550, fontSize: 44, weight: 500 as const },
};

/** Slides 09 e 10 — Serviços Complementares (Som e Wi-Fi). Layout único
 * reutilizado pelos dois: Título + Descrição + rodapé "Investimento R$ …". Sem
 * tabela e sem lista de produtos. Coordenadas PROVISÓRIAS: ajustar conforme a
 * arte de page-09-sound-project.png / page-10-wifi-premium.png. */
export const SERVICO = {
  // Sem título (vem no próprio template). Overlays no painel ESQUERDO, texto
  // BRANCO. Coordenadas PROVISÓRIAS — ajustar sobre a arte real.
  /** Descrição — dentro do quadrado azul à DIREITA, abaixo do bloco Investimento.
   *  Cada linha (split por \n) vira um item com bullet pequeno. */
  descricao: {
    left: 620,
    top: 315,
    width: 310,
    fontSize: 17,
    weight: 500 as const,
    lineHeight: 1.35,
    /** Trunca (…) para nunca exceder a área e gerar página extra. */
    maxChars: 380,
    /** Espaçamento vertical entre as linhas (itens com bullet). */
    gapLinhas: 3,
    /** Marcador (bullet) pequeno, folga até o texto e alinhamento vertical. */
    bulletFontSize: 8,
    bulletGap: 6,
    bulletMarginTop: 5,
  },
  /** Investimento (rótulo + valor) — bloco azul à DIREITA, parte de cima; rótulo
   *  e valor CENTRALIZADOS. Texto branco. */
  investimento: {
    left: 580,
    top: 200,
    width: 320,
    rotuloFontSize: 22,
    rotuloWeight: 700 as const,
    valorFontSize: 34,
    valorWeight: 700 as const,
    valorMarginTop: 4,
  },
};

/** Slide 12 — pagamento: caixa cinza medida no template (page-12-payment.png):
 * px left=297 right=1622 top=455 bottom=818 → pts left≈149 top≈228 w≈662 h≈181.
 * O container recebe EXATAMENTE essa caixa e centraliza o conteúdo por flexbox
 * (justifyContent+alignItems center) — centragem h/v robusta.
 * Cada linha é renderizada como [bullet menor] + [texto], para o marcador (●)
 * não ficar do mesmo tamanho gigante da fonte do texto. */
export const PAGAMENTO = {
  box: { left: 149, top: 228, width: 662, height: 181 },
  texto: { fontSize: 40, weight: 700 as const },
  /** Marcador de lista (●): pequeno em relação ao texto e com folga até a palavra. */
  bullet: { fontSize: 12, gap: 12 },
  /** Espaço vertical entre as linhas. */
  gapLinhas: 16,
};
