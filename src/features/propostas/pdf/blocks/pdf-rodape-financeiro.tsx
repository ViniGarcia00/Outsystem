import { Text, View } from "@react-pdf/renderer";

import type { PropostaPdfDTO } from "@/services/proposta-pdf.mapper";

import { formatCurrency, formatPercent } from "../format";
import type { Tema } from "../theme";

/**
 * Rodapé financeiro do PDF Detalhado (Sprint 2.10.1). Consome o Resumo
 * Financeiro homologado (`dto.resumo`, `calcularResumoFinanceiro` — desconto
 * sobre o Total combinado): Produtos → Serviços da Automação (só Completa) →
 * Projeto Som Ambiente / Projeto Wi-Fi Premium (quando existirem) → Desconto →
 * Frete → **TOTAL DA PROPOSTA** (= Total Geral). Nada é recalculado aqui.
 * Alinhado à direita; não quebra entre páginas.
 */

function Linha({
  tema,
  rotulo,
  valor,
  forte,
}: {
  tema: Tema;
  rotulo: string;
  valor: string;
  forte?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: tema.espaco(0.75),
      }}
    >
      <Text
        style={{
          fontFamily: tema.fonte,
          fontSize: tema.tamanho.base,
          fontWeight: forte ? tema.pesos.semibold : tema.pesos.regular,
          color: forte ? tema.cores.texto : tema.cores.textoSuave,
        }}
      >
        {rotulo}
      </Text>
      <Text
        style={{
          fontFamily: tema.fonte,
          fontSize: tema.tamanho.base,
          fontWeight: forte ? tema.pesos.semibold : tema.pesos.regular,
          color: tema.cores.texto,
        }}
      >
        {valor}
      </Text>
    </View>
  );
}

export function PdfRodapeFinanceiro({
  tema,
  dto,
}: {
  tema: Tema;
  dto: PropostaPdfDTO;
}) {
  const { resumo, servicos, simplificada, desconto } = dto;
  const som = servicos.find((s) => s.tipo === "SOM");
  const wifi = servicos.find((s) => s.tipo === "WIFI");
  // Anota o percentual quando o desconto é percentual (ex.: "Desconto (10%)").
  const descontoLabel =
    desconto.tipo === "PERCENTUAL" && desconto.valor > 0
      ? `Desconto (${formatPercent(desconto.valor)}%)`
      : "Desconto";

  return (
    <View
      wrap={false}
      style={{
        marginTop: tema.espaco(4),
        flexDirection: "row",
        justifyContent: "flex-end",
      }}
    >
      <View style={{ width: 268 }}>
        <Linha
          tema={tema}
          rotulo="Produtos"
          valor={formatCurrency(resumo.produtos)}
        />
        {!simplificada && (
          <Linha
            tema={tema}
            rotulo="Serviços da Automação"
            valor={formatCurrency(resumo.servicos)}
          />
        )}
        {/* Linhas Som/Wi-Fi SEMPRE visíveis no Comercial (R$ 0,00 quando o
            serviço não existe); ocultas apenas na Simplificada. */}
        {!simplificada && (
          <Linha
            tema={tema}
            rotulo="Projeto Som Ambiente"
            valor={formatCurrency(som?.valorTotal ?? 0)}
          />
        )}
        {!simplificada && (
          <Linha
            tema={tema}
            rotulo="Projeto Wi-Fi Premium"
            valor={formatCurrency(wifi?.valorTotal ?? 0)}
          />
        )}
        {/* Desconto e Frete SEMPRE visíveis (R$ 0,00 quando zerados) — estrutura
            fixa do orçamento. Desconto mostra "−" apenas quando há valor. */}
        <Linha
          tema={tema}
          rotulo={descontoLabel}
          valor={
            resumo.descontoAplicado > 0
              ? `− ${formatCurrency(resumo.descontoAplicado)}`
              : formatCurrency(0)
          }
        />
        <Linha tema={tema} rotulo="Frete" valor={formatCurrency(resumo.frete)} />

        <View
          style={{
            marginVertical: tema.espaco(0.75),
            borderBottomWidth: 0.5,
            borderBottomColor: tema.cores.linha,
          }}
        />

        {/* TOTAL — faixa de destaque. */}
        <View
          style={{
            marginTop: tema.espaco(1.5),
            backgroundColor: tema.cores.primaria,
            borderRadius: 4,
            paddingVertical: tema.espaco(1.75),
            paddingHorizontal: tema.espaco(2.5),
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: tema.fonte,
              fontSize: tema.tamanho.sm,
              fontWeight: tema.pesos.semibold,
              color: tema.cores.branco,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              lineHeight: 1,
            }}
          >
            Total da Proposta
          </Text>
          <Text
            style={{
              fontFamily: tema.fonte,
              fontSize: tema.tamanho.xl,
              fontWeight: tema.pesos.bold,
              color: tema.cores.branco,
              lineHeight: 1,
              textAlign: "right",
            }}
          >
            {formatCurrency(resumo.totalGeral)}
          </Text>
        </View>
      </View>
    </View>
  );
}
