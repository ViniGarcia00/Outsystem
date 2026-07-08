import { Text, View } from "@react-pdf/renderer";

import type { PropostaPdfDTO } from "@/services/proposta-pdf.mapper";

import { formatCurrency } from "../format";
import { CAPA, CORES, FONTE, INVESTIMENTO, ITENS, PAGAMENTO } from "./coords";
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

// ── Página 6 — DINÂMICA: Itens agrupados por seção (nome da seção + produtos).
// Sem preço/subtotal/desconto/frete (e sem quantidade — conforme o formato pedido).
//
// Para NUNCA gerar página extra nem quebrar o template, a lista é limitada por um
// orçamento de altura (`ITENS.layout`). Quando o conteúdo não cabe, a listagem é
// interrompida e exibe "... + X itens adicionais" (X = produtos que não couberam).
type GrupoItens = { nome: string; itens: string[] };

function distribuirItens(secoes: PropostaPdfDTO["secoes"]): {
  grupos: GrupoItens[];
  restantes: number;
} {
  const L = ITENS.layout;
  const grupos: GrupoItens[] = [];
  let usado = 0;
  let restantes = 0;
  let cortou = false;

  secoes.forEach((secao, idx) => {
    if (cortou) {
      restantes += secao.itens.length;
      return;
    }
    const alturaHeader = idx === 0 ? L.alturaSecaoPrimeira : L.alturaSecao;
    // Só inclui a seção se couber ao menos o cabeçalho + 1 produto.
    if (usado + alturaHeader + L.alturaProduto > L.alturaMax) {
      cortou = true;
      restantes += secao.itens.length;
      return;
    }
    usado += alturaHeader;
    const itens: string[] = [];
    for (const item of secao.itens) {
      if (usado + L.alturaProduto > L.alturaMax) {
        cortou = true;
        break;
      }
      itens.push(item.descricao);
      usado += L.alturaProduto;
    }
    restantes += secao.itens.length - itens.length;
    grupos.push({ nome: secao.nome, itens });
  });

  return { grupos, restantes };
}

export function PaginaItens({ dto, bg }: Dyn) {
  const { grupos, restantes } = distribuirItens(dto.secoes);
  return (
    <PresentationPage background={bg}>
      <View style={{ position: "absolute", ...ITENS.area }}>
        {grupos.map((secao, si) => (
          <View key={si}>
            <Text
              style={{
                fontFamily: FONTE,
                fontSize: ITENS.secao.fontSize,
                fontWeight: ITENS.secao.weight,
                color: CORES.azul,
                marginTop: si === 0 ? 0 : ITENS.secao.marginTop,
                marginBottom: ITENS.secao.marginBottom,
              }}
            >
              {secao.nome}
            </Text>
            {secao.itens.map((descricao, ii) => (
              <Text
                key={ii}
                style={{
                  fontFamily: FONTE,
                  fontSize: ITENS.produto.fontSize,
                  fontWeight: ITENS.produto.weight,
                  color: CORES.branco,
                  marginBottom: ITENS.produto.marginBottom,
                }}
              >
                {`•  ${descricao}`}
              </Text>
            ))}
          </View>
        ))}
        {restantes > 0 && (
          <Text
            style={{
              fontFamily: FONTE,
              fontSize: ITENS.mais.fontSize,
              color: CORES.suave,
              marginTop: 4,
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

// ── Página 8 — DINÂMICA: Valor Total + Prazo estimado de instalação.
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
            color: CORES.azul,
            textAlign: "center",
          }}
        >
          {dto.previsaoInstalacao?.trim() || "A combinar"}
        </Text>
      </View>
    </PresentationPage>
  );
}

// ── Página 9 — DINÂMICA: Forma de Pagamento (campo da proposta).
export function PaginaPagamento({ dto, bg }: Dyn) {
  return (
    <PresentationPage background={bg}>
      <View
        style={{
          position: "absolute",
          left: PAGAMENTO.box.left,
          top: PAGAMENTO.box.top,
          width: PAGAMENTO.box.width,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: FONTE,
            fontSize: PAGAMENTO.box.fontSize,
            fontWeight: PAGAMENTO.box.weight,
            color: CORES.azul,
            textAlign: "center",
          }}
        >
          {dto.formaPagamento?.trim() || "A combinar"}
        </Text>
      </View>
    </PresentationPage>
  );
}

// ── Página 10 — FIXA: Obrigado.
export function PaginaObrigado({ bg }: Fixed) {
  return <PresentationPage background={bg} />;
}
