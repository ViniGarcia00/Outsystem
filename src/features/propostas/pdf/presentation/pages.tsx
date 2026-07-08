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

// ── Página 1 — DINÂMICA: Nome do Projeto + Nome do Cliente (bloco inf. esquerdo).
export function PaginaCapa({ dto, bg }: Dyn) {
  return (
    <PresentationPage background={bg}>
      <View style={{ position: "absolute", ...CAPA.bloco }}>
        <Text
          style={{
            fontFamily: FONTE,
            fontSize: CAPA.projeto.fontSize,
            fontWeight: CAPA.projeto.weight,
            color: CORES.azul,
          }}
        >
          {dto.nomeProjeto?.trim() || "—"}
        </Text>
        <Text
          style={{
            fontFamily: FONTE,
            fontSize: CAPA.cliente.fontSize,
            fontWeight: CAPA.cliente.weight,
            color: CORES.branco,
            marginTop: CAPA.cliente.marginTop,
          }}
        >
          {dto.cliente.nome}
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
export function PaginaItens({ dto, bg }: Dyn) {
  return (
    <PresentationPage background={bg}>
      <View style={{ position: "absolute", ...ITENS.area }}>
        {dto.secoes.map((secao, si) => (
          <View key={si} wrap={false}>
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
            {secao.itens.map((item, ii) => (
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
                {`•  ${item.descricao}`}
              </Text>
            ))}
          </View>
        ))}
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
