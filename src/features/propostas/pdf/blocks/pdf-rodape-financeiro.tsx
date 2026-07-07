import { Text, View } from "@react-pdf/renderer";

import type { PropostaPdfDTO } from "@/services/proposta-pdf.mapper";

import { formatCurrency, formatPercent } from "../format";
import type { Tema } from "../theme";

/**
 * Rodapé financeiro. Mesma lógica/ordem da aplicação (via `totais`): Total
 * Produtos → Total Serviços (só Completa) → Subtotal → Desconto → Frete →
 * **TOTAL DA PROPOSTA** (elemento de maior destaque). Alinhado à direita; não
 * quebra entre páginas.
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
  const { totais, simplificada, desconto } = dto;
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
          rotulo="Total Produtos"
          valor={formatCurrency(totais.totalProdutos)}
        />
        {!simplificada && (
          <Linha
            tema={tema}
            rotulo="Total Serviços"
            valor={formatCurrency(totais.totalServicos)}
          />
        )}

        <View
          style={{
            marginVertical: tema.espaco(0.75),
            borderBottomWidth: 0.5,
            borderBottomColor: tema.cores.linha,
          }}
        />

        <Linha
          tema={tema}
          rotulo="Subtotal"
          valor={formatCurrency(totais.subtotal)}
          forte
        />
        {totais.descontoAplicado > 0 && (
          <Linha
            tema={tema}
            rotulo={descontoLabel}
            valor={`− ${formatCurrency(totais.descontoAplicado)}`}
          />
        )}
        <Linha tema={tema} rotulo="Frete" valor={formatCurrency(totais.frete)} />

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
            }}
          >
            {formatCurrency(totais.totalProposta)}
          </Text>
        </View>
      </View>
    </View>
  );
}
