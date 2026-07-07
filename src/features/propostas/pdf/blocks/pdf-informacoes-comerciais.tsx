import { Text, View } from "@react-pdf/renderer";

import { PdfSecaoTitulo } from "../primitives";
import type { Tema } from "../theme";

/**
 * Bloco 1 — INFORMAÇÕES COMERCIAIS: Forma de Pagamento e Previsão de Instalação
 * (esta última apenas no modelo Completa). Separado do bloco de Observações.
 * Não renderiza se não houver nada a mostrar.
 */

function Item({
  tema,
  rotulo,
  valor,
}: {
  tema: Tema;
  rotulo: string;
  valor: string;
}) {
  return (
    <View style={{ flexDirection: "row", marginBottom: tema.espaco(1) }}>
      <Text
        style={{
          width: 128,
          fontFamily: tema.fonte,
          fontSize: tema.tamanho.base,
          fontWeight: tema.pesos.semibold,
          color: tema.cores.textoSuave,
        }}
      >
        {rotulo}
      </Text>
      <Text
        style={{
          flexGrow: 1,
          flexBasis: 0,
          fontFamily: tema.fonte,
          fontSize: tema.tamanho.base,
          color: tema.cores.texto,
        }}
      >
        {valor}
      </Text>
    </View>
  );
}

export function PdfInformacoesComerciais({
  tema,
  formaPagamento,
  previsaoInstalacao,
  simplificada,
}: {
  tema: Tema;
  formaPagamento: string | null;
  previsaoInstalacao: string | null;
  simplificada: boolean;
}) {
  // Previsão de instalação NÃO aparece na Simplificada.
  const mostrarPrevisao = !simplificada && !!previsaoInstalacao;
  if (!formaPagamento && !mostrarPrevisao) return null;

  return (
    <View wrap={false}>
      <PdfSecaoTitulo tema={tema}>Informações Comerciais</PdfSecaoTitulo>
      {formaPagamento && (
        <Item tema={tema} rotulo="Forma de pagamento" valor={formaPagamento} />
      )}
      {mostrarPrevisao && (
        <Item
          tema={tema}
          rotulo="Previsão de instalação"
          valor={previsaoInstalacao as string}
        />
      )}
    </View>
  );
}
