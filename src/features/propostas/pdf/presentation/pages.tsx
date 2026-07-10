import { Text, View } from "@react-pdf/renderer";

import type { PropostaPdfDTO } from "@/services/proposta-pdf.mapper";

import { formatCurrency, formatQuantidade } from "../format";
import {
  CAPA,
  CORES,
  FONTE,
  INVESTIMENTO,
  INVESTIMENTO_TOTAL,
  ITENS,
  PAGAMENTO,
  SERVICO,
} from "./coords";
import { PresentationPage } from "./page-shell";

/**
 * As 10 páginas do PDF Apresentação. Cada uma usa o respectivo template como
 * PLANO DE FUNDO (nenhuma é redesenhada). As páginas FIXAS (2,3,4,5,7,10) são
 * só o fundo; as DINÂMICAS (1,6,8,9) sobrepõem os campos variáveis, reutilizando
 * exatamente o `PropostaPdfDTO` (mesmos dados do PDF Comercial).
 */

type Dyn = { dto: PropostaPdfDTO; bg: string };
type Fixed = { bg: string };

/** Limita o texto a `max` caracteres (com reticências) — evita 3ª linha/overflow. */
function truncar(texto: string, max: number): string {
  const s = texto.trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

// ── Página 1 — DINÂMICA: Nome do Projeto + Nome do Cliente (bloco inf. esquerdo).
export function PaginaCapa({ dto, bg }: Dyn) {
  return (
    <PresentationPage background={bg}>
      <View style={{ position: "absolute", ...CAPA.bloco }}>
        {/* Linha 1: Cliente (branco, um pouco mais grosso). Linha 2: Nome do
            Projeto (branco, colado abaixo). Truncamento (~2 linhas) garante que o
            bloco nunca transborde a página (10 páginas) nem invada a arte. */}
        <Text
          style={{
            fontFamily: FONTE,
            fontSize: CAPA.cliente.fontSize,
            fontWeight: CAPA.cliente.weight,
            color: CORES.branco,
          }}
        >
          {truncar(dto.cliente.nome, CAPA.cliente.maxChars)}
        </Text>
        <Text
          style={{
            fontFamily: FONTE,
            fontSize: CAPA.projeto.fontSize,
            fontWeight: CAPA.projeto.weight,
            color: CORES.branco,
            marginTop: CAPA.projeto.marginTop,
          }}
        >
          {truncar(dto.nomeProjeto || "—", CAPA.projeto.maxChars)}
        </Text>
      </View>
    </PresentationPage>
  );
}

// ── Página 2 — FIXA: Quem Somos.
export function PaginaQuemSomos({ bg }: Fixed) {
  return <PresentationPage background={bg} />;
}

// ── Página 3 — FIXA: Por que Automatizar.
export function PaginaBeneficios({ bg }: Fixed) {
  return <PresentationPage background={bg} />;
}

// ── Página 4 — FIXA: Cases / Projetos.
export function PaginaCases({ bg }: Fixed) {
  return <PresentationPage background={bg} />;
}

// ── Página 5 — FIXA: Como Trabalhamos.
export function PaginaProcesso({ bg }: Fixed) {
  return <PresentationPage background={bg} />;
}

// ── Página 6 — DINÂMICA: Itens em ATÉ 3 COLUNAS (cartões de fundo). Cada linha é
// um cabeçalho de seção OU um produto (quantidade + descrição). Máx. de 13 linhas
// por coluna; o excedente vira "... + X itens adicionais". Nunca estoura a página.
type LinhaSecao = { tipo: "secao"; nome: string };
type LinhaProduto = { tipo: "produto"; qtd: string; desc: string };
type Linha = LinhaSecao | LinhaProduto;

/**
 * Distribui seções/produtos em até `maxColunas` colunas (no máx. `maxLinhas`
 * linhas cada). Evita cabeçalho de seção órfão no fim da coluna. `restantes` =
 * produtos que não couberam (viram "... + X itens adicionais").
 */
function distribuirColunas(secoes: PropostaPdfDTO["secoes"]): {
  colunas: Linha[][];
  restantes: number;
} {
  const { maxColunas, maxLinhasColuna } = ITENS;
  const linhas: Linha[] = [];
  for (const s of secoes) {
    linhas.push({ tipo: "secao", nome: s.nome });
    for (const it of s.itens) {
      linhas.push({
        tipo: "produto",
        qtd: formatQuantidade(it.quantidade),
        desc: it.descricao,
      });
    }
  }

  const colunas: Linha[][] = [[]];
  let ci = 0;
  let restantes = 0;
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const espaco = maxLinhasColuna - colunas[ci].length;
    const proximoProduto = linhas[i + 1]?.tipo === "produto";
    const orfao = linha.tipo === "secao" && espaco < 2 && proximoProduto;
    if (espaco <= 0 || orfao) {
      if (ci + 1 >= maxColunas) {
        restantes = linhas.slice(i).filter((l) => l.tipo === "produto").length;
        break;
      }
      ci += 1;
      colunas.push([]);
    }
    colunas[ci].push(linha);
  }

  return { colunas, restantes };
}

export function PaginaItens({ dto, bg }: Dyn) {
  const { colunas, restantes } = distribuirColunas(dto.secoes);
  return (
    <PresentationPage background={bg}>
      <View style={{ position: "absolute", ...ITENS.area }}>
        <View style={{ flexDirection: "row", gap: ITENS.gapColuna }}>
          {colunas.map((coluna, ci) => (
            <View
              key={ci}
              style={{
                flexGrow: 1,
                flexBasis: 0,
                backgroundColor: ITENS.painel.bg,
                borderRadius: ITENS.painel.radius,
                padding: ITENS.painel.padding,
              }}
            >
              {coluna.map((linha, li) =>
                linha.tipo === "secao" ? (
                  <View
                    key={li}
                    style={{
                      backgroundColor: ITENS.secao.bg,
                      paddingVertical: ITENS.secao.padY,
                      paddingHorizontal: ITENS.secao.padX,
                      borderRadius: 3,
                      marginTop: li === 0 ? 0 : ITENS.secao.marginTop,
                      marginBottom: 3,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: FONTE,
                        fontSize: ITENS.secao.fontSize,
                        fontWeight: ITENS.secao.weight,
                        color: ITENS.secao.cor,
                      }}
                    >
                      {linha.nome}
                    </Text>
                  </View>
                ) : (
                  <View
                    key={li}
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      paddingVertical: ITENS.produto.padY,
                      borderBottomWidth: 0.5,
                      borderBottomColor: ITENS.produto.divisor,
                    }}
                  >
                    <Text
                      style={{
                        width: ITENS.produto.qtdWidth,
                        marginRight: 6,
                        textAlign: "right",
                        fontFamily: FONTE,
                        fontSize: ITENS.produto.fontSize,
                        fontWeight: 700,
                        color: ITENS.produto.cor,
                      }}
                    >
                      {linha.qtd}
                    </Text>
                    <Text
                      style={{
                        flexGrow: 1,
                        flexBasis: 0,
                        fontFamily: FONTE,
                        fontSize: ITENS.produto.fontSize,
                        fontWeight: ITENS.produto.weight,
                        color: ITENS.produto.cor,
                      }}
                    >
                      {linha.desc}
                    </Text>
                  </View>
                ),
              )}
            </View>
          ))}
        </View>
        {restantes > 0 && (
          <Text
            style={{
              fontFamily: FONTE,
              fontSize: ITENS.mais.fontSize,
              color: ITENS.mais.cor,
              marginTop: 6,
            }}
          >
            {`... + ${restantes} ${restantes === 1 ? "item adicional" : "itens adicionais"}`}
          </Text>
        )}
      </View>
    </PresentationPage>
  );
}

// ── Página 7 — FIXA: Serviços / Diferenciais.
export function PaginaServicos({ bg }: Fixed) {
  return <PresentationPage background={bg} />;
}

// ── Slides de Serviços Complementares (Sprint 2.9.3) — Som e Wi-Fi. Só existem
// quando há o serviço correspondente (ver presentation-document.tsx). Layout
// único: Título + Descrição + rodapé "Investimento R$ …" (sem tabela/produtos).
export function PaginaServicoComplementar({
  servico,
  bg,
}: {
  servico: PropostaPdfDTO["servicos"][number];
  bg: string;
}) {
  return (
    <PresentationPage background={bg}>
      {/* Descrição — quadrado azul à direita, branco. Cada linha (split por \n)
          vira um item com bullet pequeno. Título NÃO é renderizado (vem no template). */}
      <View
        style={{
          position: "absolute",
          left: SERVICO.descricao.left,
          top: SERVICO.descricao.top,
          width: SERVICO.descricao.width,
          gap: SERVICO.descricao.gapLinhas,
        }}
      >
        {truncar(servico.descricao?.trim() || "—", SERVICO.descricao.maxChars)
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((linha, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <Text
                style={{
                  fontFamily: FONTE,
                  fontSize: SERVICO.descricao.bulletFontSize,
                  color: CORES.branco,
                  marginRight: SERVICO.descricao.bulletGap,
                  marginTop: SERVICO.descricao.bulletMarginTop,
                }}
              >
                ●
              </Text>
              <Text
                style={{
                  flexGrow: 1,
                  flexBasis: 0,
                  fontFamily: FONTE,
                  fontSize: SERVICO.descricao.fontSize,
                  fontWeight: SERVICO.descricao.weight,
                  color: CORES.branco,
                  lineHeight: SERVICO.descricao.lineHeight,
                }}
              >
                {linha}
              </Text>
            </View>
          ))}
      </View>

      {/* Investimento — apenas o VALOR (rótulo removido); bloco azul à direita,
          centralizado, branco. */}
      <View
        style={{
          position: "absolute",
          left: SERVICO.investimento.left,
          top: SERVICO.investimento.top,
          width: SERVICO.investimento.width,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: FONTE,
            fontSize: SERVICO.investimento.valorFontSize,
            fontWeight: SERVICO.investimento.valorWeight,
            color: CORES.branco,
          }}
        >
          {formatCurrency(servico.valorTotal)}
        </Text>
      </View>
    </PresentationPage>
  );
}

// ── Slide 08 — DINÂMICA: **Investimento da Automação** = Subtotal da Automação
// (produtos + serviços). Nunca inclui Som/Wi-Fi nem o desconto/frete globais
// (esses entram no Total Geral, slide 11). O prazo de instalação foi movido para
// o slide 11. Consome `resumo.subtotalAutomacao`.
export function PaginaInvestimento({ dto, bg }: Dyn) {
  return (
    <PresentationPage background={bg}>
      <View
        style={{
          position: "absolute",
          left: INVESTIMENTO.valor.left,
          top: INVESTIMENTO.valor.top,
          width: INVESTIMENTO.valor.width,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: FONTE,
            fontSize: INVESTIMENTO.valor.fontSize,
            fontWeight: INVESTIMENTO.valor.weight,
            color: CORES.azul,
          }}
        >
          {formatCurrency(dto.resumo.subtotalAutomacao)}
        </Text>
      </View>
    </PresentationPage>
  );
}

// ── Slide 11 — DINÂMICA: **Investimento Total** (só quando há ≥1 Serviço
// Complementar). Mostra o valor total (Total Geral, já com o desconto) no bloco;
// e, quando houver desconto, o valor inicial (sem desconto) RISCADO acima do
// bloco. Consome `resumo` — nunca recalculado.
export function PaginaInvestimentoTotal({ dto, bg }: Dyn) {
  return (
    <PresentationPage background={bg}>
      {dto.resumo.descontoAplicado > 0 && (
        <View
          style={{
            position: "absolute",
            left: INVESTIMENTO_TOTAL.original.left,
            top: INVESTIMENTO_TOTAL.original.top,
            width: INVESTIMENTO_TOTAL.original.width,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: FONTE,
              fontSize: INVESTIMENTO_TOTAL.original.fontSize,
              fontWeight: INVESTIMENTO_TOTAL.original.weight,
              color: CORES.branco,
              textDecoration: "line-through",
            }}
          >
            {formatCurrency(dto.resumo.totalGeral + dto.resumo.descontoAplicado)}
          </Text>
        </View>
      )}
      <View
        style={{
          position: "absolute",
          left: INVESTIMENTO_TOTAL.valor.left,
          top: INVESTIMENTO_TOTAL.valor.top,
          width: INVESTIMENTO_TOTAL.valor.width,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: FONTE,
            fontSize: INVESTIMENTO_TOTAL.valor.fontSize,
            fontWeight: INVESTIMENTO_TOTAL.valor.weight,
            color: CORES.azul,
          }}
        >
          {formatCurrency(dto.resumo.totalGeral)}
        </Text>
      </View>
      {/* Prazo de instalação — movido do slide 08 para cá (mesma posição). */}
      <View
        style={{
          position: "absolute",
          left: INVESTIMENTO.prazo.left,
          top: INVESTIMENTO.prazo.top,
          width: INVESTIMENTO.prazo.width,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: FONTE,
            fontSize: INVESTIMENTO.prazo.fontSize,
            fontWeight: INVESTIMENTO.prazo.weight,
            color: CORES.branco,
            textAlign: "center",
          }}
        >
          {`Prazo de Instalação: ${dto.previsaoInstalacao?.trim() || "a combinar"}`}
        </Text>
      </View>
    </PresentationPage>
  );
}

// ── Slide 12 — DINÂMICA: Forma de Pagamento (campo da proposta). Cada linha é
// renderizada com um bullet pequeno (●) + texto. Qualquer ●/• já digitado é
// removido para não duplicar o marcador.
export function PaginaPagamento({ dto, bg }: Dyn) {
  const linhas = (dto.formaPagamento?.trim() || "A combinar")
    .split("\n")
    .map((l) => l.trim().replace(/^[●•]\s*/, ""))
    .filter(Boolean);
  return (
    <PresentationPage background={bg}>
      <View
        style={{
          position: "absolute",
          left: PAGAMENTO.box.left,
          top: PAGAMENTO.box.top,
          width: PAGAMENTO.box.width,
          height: PAGAMENTO.box.height,
          alignItems: "center",
          justifyContent: "center",
          gap: PAGAMENTO.gapLinhas,
        }}
      >
        {linhas.map((linha, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={{
                fontFamily: FONTE,
                fontSize: PAGAMENTO.bullet.fontSize,
                fontWeight: PAGAMENTO.texto.weight,
                color: CORES.azul,
                marginRight: PAGAMENTO.bullet.gap,
              }}
            >
              ●
            </Text>
            <Text
              style={{
                fontFamily: FONTE,
                fontSize: PAGAMENTO.texto.fontSize,
                fontWeight: PAGAMENTO.texto.weight,
                color: CORES.azul,
              }}
            >
              {linha}
            </Text>
          </View>
        ))}
      </View>
    </PresentationPage>
  );
}

// ── Slide 13 — FIXA: Obrigado.
export function PaginaObrigado({ bg }: Fixed) {
  return <PresentationPage background={bg} />;
}
