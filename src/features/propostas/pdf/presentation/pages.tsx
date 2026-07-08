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

/** Rótulo dos serviços complementares no PDF (Sprint 2.9.3). */
const PROJETO_LABEL: Record<PropostaPdfDTO["servicos"][number]["tipo"], string> = {
  SOM: "Projeto Som Ambiente",
  WIFI: "Projeto Wi-Fi Premium",
};

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
      <View
        style={{
          position: "absolute",
          left: SERVICO.titulo.left,
          top: SERVICO.titulo.top,
          width: SERVICO.titulo.width,
        }}
      >
        <Text
          style={{
            fontFamily: FONTE,
            fontSize: SERVICO.titulo.fontSize,
            fontWeight: SERVICO.titulo.weight,
            color: CORES.azul,
          }}
        >
          {PROJETO_LABEL[servico.tipo]}
        </Text>
      </View>

      <View
        style={{
          position: "absolute",
          left: SERVICO.descricao.left,
          top: SERVICO.descricao.top,
          width: SERVICO.descricao.width,
        }}
      >
        <Text
          style={{
            fontFamily: FONTE,
            fontSize: SERVICO.descricao.fontSize,
            fontWeight: SERVICO.descricao.weight,
            color: CORES.texto,
            lineHeight: SERVICO.descricao.lineHeight,
          }}
        >
          {truncar(servico.descricao?.trim() || "—", SERVICO.descricao.maxChars)}
        </Text>
      </View>

      <View
        style={{
          position: "absolute",
          left: SERVICO.investimento.left,
          top: SERVICO.investimento.top,
          width: SERVICO.investimento.width,
        }}
      >
        <Text
          style={{
            fontFamily: FONTE,
            fontSize: SERVICO.investimento.rotuloFontSize,
            fontWeight: SERVICO.investimento.rotuloWeight,
            color: CORES.azul,
          }}
        >
          Investimento
        </Text>
        <Text
          style={{
            fontFamily: FONTE,
            fontSize: SERVICO.investimento.valorFontSize,
            fontWeight: SERVICO.investimento.valorWeight,
            color: CORES.azul,
            marginTop: SERVICO.investimento.valorMarginTop,
          }}
        >
          {formatCurrency(servico.valorTotal)}
        </Text>
      </View>
    </PresentationPage>
  );
}

// ── Página 8 — DINÂMICA: **Investimento da Automação** (valor único) + Prazo de
// instalação. Representa EXCLUSIVAMENTE a Automação — nunca inclui Som/Wi-Fi.
// Consome `totais.totalProposta` (= Investimento da Automação); nada recalculado.
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
          {formatCurrency(dto.totais.totalProposta)}
        </Text>
      </View>
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

// ── Página 11 — DINÂMICA: **Investimento Total** (só quando há ≥1 Serviço
// Complementar). Detalha Projeto Automação + Som/Wi-Fi (os que existirem),
// divisor, e a linha Investimento Total. Todos os valores vêm do DTO
// (`calcularInvestimento`, Sprint 2.9.2) — nunca recalculados aqui.
export function PaginaInvestimentoTotal({ dto, bg }: Dyn) {
  return (
    <PresentationPage background={bg}>
      <View
        style={{
          position: "absolute",
          left: INVESTIMENTO_TOTAL.area.left,
          top: INVESTIMENTO_TOTAL.area.top,
          width: INVESTIMENTO_TOTAL.area.width,
          gap: INVESTIMENTO_TOTAL.gap,
        }}
      >
        <LinhaInvestimento
          label="Projeto Automação"
          valor={dto.investimento.automacao}
        />
        {dto.servicos.map((s) => (
          <LinhaInvestimento
            key={s.tipo}
            label={PROJETO_LABEL[s.tipo]}
            valor={s.valorTotal}
          />
        ))}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
            borderTopWidth: 1,
            borderTopColor: INVESTIMENTO_TOTAL.divisorColor,
            marginTop: INVESTIMENTO_TOTAL.divisorMarginTop,
            paddingTop: INVESTIMENTO_TOTAL.divisorPaddingTop,
          }}
        >
          <Text
            style={{
              fontFamily: FONTE,
              fontSize: INVESTIMENTO_TOTAL.totalFontSize,
              fontWeight: INVESTIMENTO_TOTAL.totalWeight,
              color: CORES.azul,
            }}
          >
            Investimento Total
          </Text>
          <Text
            style={{
              fontFamily: FONTE,
              fontSize: INVESTIMENTO_TOTAL.totalFontSize,
              fontWeight: INVESTIMENTO_TOTAL.totalWeight,
              color: CORES.azul,
            }}
          >
            {formatCurrency(dto.investimento.total)}
          </Text>
        </View>
      </View>
    </PresentationPage>
  );
}

/** Linha rótulo→valor do detalhamento do Investimento Total (slide 11). */
function LinhaInvestimento({ label, valor }: { label: string; valor: number }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
      }}
    >
      <Text
        style={{
          fontFamily: FONTE,
          fontSize: INVESTIMENTO_TOTAL.rotuloFontSize,
          fontWeight: INVESTIMENTO_TOTAL.rotuloWeight,
          color: CORES.azul,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: FONTE,
          fontSize: INVESTIMENTO_TOTAL.valorFontSize,
          fontWeight: INVESTIMENTO_TOTAL.valorWeight,
          color: CORES.azul,
        }}
      >
        {formatCurrency(valor)}
      </Text>
    </View>
  );
}

// ── Slide 12 — DINÂMICA: Forma de Pagamento (campo da proposta). Cada linha é
// renderizada como [marcador menor] + [texto], para o bullet (●/•) não sair do
// tamanho gigante da fonte do texto. Linhas sem marcador saem só como texto.
export function PaginaPagamento({ dto, bg }: Dyn) {
  const linhas = (dto.formaPagamento?.trim() || "A combinar")
    .split("\n")
    .map((l) => l.trim())
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
        {linhas.map((linha, i) => {
          const m = /^([●•])\s*(.*)$/.exec(linha);
          return (
            <View
              key={i}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              {m && (
                <Text
                  style={{
                    fontFamily: FONTE,
                    fontSize: PAGAMENTO.bullet.fontSize,
                    fontWeight: PAGAMENTO.texto.weight,
                    color: CORES.azul,
                    marginRight: PAGAMENTO.bullet.gap,
                  }}
                >
                  {m[1]}
                </Text>
              )}
              <Text
                style={{
                  fontFamily: FONTE,
                  fontSize: PAGAMENTO.texto.fontSize,
                  fontWeight: PAGAMENTO.texto.weight,
                  color: CORES.azul,
                }}
              >
                {m ? m[2] : linha}
              </Text>
            </View>
          );
        })}
      </View>
    </PresentationPage>
  );
}

// ── Slide 13 — FIXA: Obrigado.
export function PaginaObrigado({ bg }: Fixed) {
  return <PresentationPage background={bg} />;
}
