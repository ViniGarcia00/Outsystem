import { Text, View } from "@react-pdf/renderer";

import type { PdfServico } from "@/services/proposta-pdf.mapper";

import { formatCurrency } from "../format";
import type { Tema } from "../theme";

/**
 * Seção de um Serviço Complementar (Som Ambiente / Wi-Fi Premium). Mesma
 * identidade das seções da tabela: banda de título + Descrição + valor. NÃO
 * lista produtos internos do serviço — só descrição e valor total do projeto,
 * vindo do DTO (nunca recalculado). O rótulo do valor muda por documento:
 * "Valor do Projeto" no Detalhado, "Subtotal" no Contratual (Sprint 2.10.2 —
 * o cliente vê o subtotal de cada projeto contratado, sem a composição).
 */
export function PdfServicoComplementar({
  tema,
  titulo,
  servico,
  rotuloValor = "Valor do Projeto",
}: {
  tema: Tema;
  titulo: string;
  servico: PdfServico;
  /** Rótulo da linha de valor: "Valor do Projeto" (Detalhado) | "Subtotal" (Contratual). */
  rotuloValor?: string;
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
            {rotuloValor}
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
      </View>
    </View>
  );
}
