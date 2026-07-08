import { Text, View } from "@react-pdf/renderer";

import type { PropostaPdfDTO } from "@/services/proposta-pdf.mapper";

import { formatCurrency } from "../format";
import type { Tema } from "../theme";
import { PlaceholderInstitucional, PresentationPage } from "./page-shell";

/**
 * As 10 páginas do PDF Apresentação. Páginas DINÂMICAS consomem exatamente o
 * mesmo `PropostaPdfDTO` do PDF Comercial (sem consultas/regra paralelas); as
 * páginas FIXAS trazem placeholders — o design premium será detalhado na Sprint
 * 3.1. A ordem é fixada em `PresentationDocument`.
 */

type PageProps = { dto: PropostaPdfDTO; tema: Tema };

const rotulo = (tema: Tema) =>
  ({
    fontSize: tema.tamanho.xs,
    fontWeight: tema.pesos.semibold,
    color: tema.cores.textoSuave,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  }) as const;

// Página 1 — DINÂMICA: Nome do Cliente + Nome do Projeto.
export function PaginaCapa({ dto, tema }: PageProps) {
  return (
    <PresentationPage tema={tema}>
      <View style={{ flexGrow: 1, justifyContent: "center" }}>
        <Text
          style={{
            fontSize: tema.tamanho.sm,
            fontWeight: tema.pesos.semibold,
            color: tema.cores.primaria,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          {dto.empresa.nome} · Proposta Comercial
        </Text>
        <Text
          style={{
            fontSize: 34,
            fontWeight: tema.pesos.bold,
            color: tema.cores.texto,
            marginTop: tema.espaco(4),
          }}
        >
          {dto.nomeProjeto?.trim() || "Proposta"}
        </Text>
        <Text
          style={{
            fontSize: tema.tamanho.lg,
            color: tema.cores.textoSuave,
            marginTop: tema.espaco(2),
          }}
        >
          Preparado para {dto.cliente.nome}
        </Text>
        <View
          style={{
            marginTop: tema.espaco(6),
            width: 60,
            height: 3,
            backgroundColor: tema.cores.primaria,
          }}
        />
        <Text
          style={{
            fontSize: tema.tamanho.sm,
            color: tema.cores.textoClaro,
            marginTop: tema.espaco(3),
          }}
        >
          {`Nº ${dto.numero}${dto.revisao != null ? ` · Rev.${dto.revisao}` : ""}`}
        </Text>
      </View>
    </PresentationPage>
  );
}

// Página 2 — FIXA: Quem Somos.
export function PaginaQuemSomos({ tema }: PageProps) {
  return (
    <PresentationPage tema={tema} titulo="Quem Somos">
      <PlaceholderInstitucional tema={tema} />
    </PresentationPage>
  );
}

// Página 3 — FIXA: Por que Automatizar.
export function PaginaPorQueAutomatizar({ tema }: PageProps) {
  return (
    <PresentationPage tema={tema} titulo="Por que Automatizar">
      <PlaceholderInstitucional tema={tema} />
    </PresentationPage>
  );
}

// Página 4 — FIXA: Cases / Projetos.
export function PaginaCases({ tema }: PageProps) {
  return (
    <PresentationPage tema={tema} titulo="Cases / Projetos">
      <PlaceholderInstitucional tema={tema} />
    </PresentationPage>
  );
}

// Página 5 — FIXA: Como Trabalhamos.
export function PaginaComoTrabalhamos({ tema }: PageProps) {
  return (
    <PresentationPage tema={tema} titulo="Como Trabalhamos">
      <PlaceholderInstitucional tema={tema} />
    </PresentationPage>
  );
}

// Página 6 — DINÂMICA: Itens do Projeto (só nome da seção + lista de produtos;
// sem preço/quantidade/subtotal/desconto/frete).
export function PaginaItens({ dto, tema }: PageProps) {
  return (
    <PresentationPage tema={tema} titulo="Itens do Projeto">
      {dto.secoes.length === 0 ? (
        <Text style={{ color: tema.cores.textoSuave }}>
          Nenhum item cadastrado.
        </Text>
      ) : (
        dto.secoes.map((secao, si) => (
          <View
            key={si}
            wrap={false}
            style={{ marginBottom: tema.espaco(4) }}
          >
            <Text
              style={{
                fontSize: tema.tamanho.md,
                fontWeight: tema.pesos.semibold,
                color: tema.cores.primaria,
                marginBottom: tema.espaco(1.5),
              }}
            >
              {secao.nome}
            </Text>
            {secao.itens.map((item, ii) => (
              <View
                key={ii}
                style={{ flexDirection: "row", marginBottom: 3 }}
              >
                <Text
                  style={{ color: tema.cores.primaria, marginRight: tema.espaco(1.5) }}
                >
                  •
                </Text>
                <Text style={{ flexGrow: 1, flexBasis: 0, color: tema.cores.texto }}>
                  {item.descricao}
                </Text>
              </View>
            ))}
          </View>
        ))
      )}
    </PresentationPage>
  );
}

// Página 7 — FIXA: Serviços / Diferenciais.
export function PaginaServicos({ tema }: PageProps) {
  return (
    <PresentationPage tema={tema} titulo="Serviços / Diferenciais">
      <PlaceholderInstitucional tema={tema} />
    </PresentationPage>
  );
}

// Página 8 — DINÂMICA: Investimento (Valor Total + prazo de instalação).
export function PaginaInvestimento({ dto, tema }: PageProps) {
  return (
    <PresentationPage tema={tema} titulo="Investimento">
      <View style={{ marginTop: tema.espaco(4) }}>
        <Text style={rotulo(tema)}>Valor Total</Text>
        <Text
          style={{
            fontSize: 30,
            fontWeight: tema.pesos.bold,
            color: tema.cores.primaria,
            marginTop: tema.espaco(1),
          }}
        >
          {formatCurrency(dto.totais.totalProposta)}
        </Text>
      </View>
      <View style={{ marginTop: tema.espaco(6) }}>
        <Text style={rotulo(tema)}>Prazo estimado de instalação</Text>
        <Text
          style={{
            fontSize: tema.tamanho.lg,
            color: tema.cores.texto,
            marginTop: tema.espaco(1),
          }}
        >
          {dto.previsaoInstalacao?.trim() || "A combinar"}
        </Text>
      </View>
    </PresentationPage>
  );
}

// Página 9 — DINÂMICA: Forma de Pagamento (campo da proposta).
export function PaginaPagamento({ dto, tema }: PageProps) {
  return (
    <PresentationPage tema={tema} titulo="Forma de Pagamento">
      <Text style={{ fontSize: tema.tamanho.lg, color: tema.cores.texto }}>
        {dto.formaPagamento?.trim() || "A combinar"}
      </Text>
    </PresentationPage>
  );
}

// Página 10 — FIXA: Obrigado (usa o texto de fechamento e contatos da empresa).
export function PaginaObrigado({ dto, tema }: PageProps) {
  const contato = [dto.empresa.site, dto.empresa.telefone, dto.empresa.email]
    .filter(Boolean)
    .join("  ·  ");
  return (
    <PresentationPage tema={tema} titulo="Obrigado">
      <PlaceholderInstitucional tema={tema} texto={dto.empresa.textoFinal} />
      {contato && (
        <Text
          style={{
            marginTop: tema.espaco(8),
            fontSize: tema.tamanho.sm,
            color: tema.cores.textoSuave,
          }}
        >
          {contato}
        </Text>
      )}
    </PresentationPage>
  );
}
