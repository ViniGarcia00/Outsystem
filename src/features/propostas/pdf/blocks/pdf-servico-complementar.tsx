import { Text, View } from "@react-pdf/renderer";

import type { PdfServico } from "@/services/proposta-pdf.mapper";

import { formatCurrency } from "../format";
import type { Tema } from "../theme";

/**
 * Seção de um Serviço Complementar (Som Ambiente / Wi-Fi Premium) no PDF
 * Detalhado (Sprint 2.10.1). Mesma identidade das seções da tabela: banda de
 * título + Descrição + "Valor do Projeto". NÃO lista produtos internos do
 * serviço — só descrição e valor. `valorTotal` vem do DTO (não recalculado).
 */
export function PdfServicoComplementar({
  tema,
  titulo,
  servico,
  mostrarValor = true,
}: {
  tema: Tema;
  titulo: string;
  servico: PdfServico;
  /** Sprint 2.10.2 — false no PDF Contratual (oculta "Valor do Projeto"). */
  mostrarValor?: boolean;
}) {
  return (
    <View minPresenceAhead={70} style={{ marginTop: tema.espaco(3) }}>
      {/* Banda de título — mesma faixa das seções da tabela. */}
      <View
        style={{
          backgroundColor: tema.cores.faixaSecao,
          paddingVertical: tema.espaco(1.25),
          paddingHorizontal: 4,
        }}
      >
        <Text
          style={{
            fontFamily: tema.fonte,
            fontSize: tema.tamanho.sm,
            fontWeight: tema.pesos.semibold,
            color: tema.cores.primaria,
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {titulo}
        </Text>
      </View>

      <View style={{ paddingVertical: tema.espaco(1.5), paddingHorizontal: 4 }}>
        {servico.descricao && (
          <Text
            style={{
              fontFamily: tema.fonte,
              fontSize: tema.tamanho.base,
              color: tema.cores.texto,
              lineHeight: 1.4,
            }}
          >
            {servico.descricao}
          </Text>
        )}
        {mostrarValor && (
          <View
            wrap={false}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: tema.espaco(1.5),
              borderTopWidth: 0.5,
              borderTopColor: tema.cores.linha,
              paddingTop: tema.espaco(1),
            }}
          >
            <Text
              style={{
                fontFamily: tema.fonte,
                fontSize: tema.tamanho.base,
                fontWeight: tema.pesos.semibold,
                color: tema.cores.textoSuave,
              }}
            >
              Valor do Projeto
            </Text>
            <Text
              style={{
                fontFamily: tema.fonte,
                fontSize: tema.tamanho.base,
                fontWeight: tema.pesos.semibold,
                color: tema.cores.texto,
              }}
            >
              {formatCurrency(servico.valorTotal)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
