import { Text, View } from "@react-pdf/renderer";

import type { PdfCliente } from "@/services/proposta-pdf.mapper";

import { PdfCampo, PdfRotulo } from "../primitives";
import type { Tema } from "../theme";

/**
 * Bloco do cliente (endereço da obra = endereço do cliente). Elegante, com boa
 * hierarquia visual — NÃO é tabela. À direita, metadados: data, validade e
 * consultor responsável.
 */
export function PdfCliente({
  tema,
  cliente,
  consultor,
  dataLabel,
  validadeDias,
}: {
  tema: Tema;
  cliente: PdfCliente;
  consultor: string | null;
  dataLabel: string;
  validadeDias: number;
}) {
  return (
    <View
      wrap={false}
      style={{
        flexDirection: "row",
        marginTop: tema.espaco(4),
        borderWidth: 0.5,
        borderColor: tema.cores.linha,
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      {/* Coluna do cliente (com barra de acento à esquerda). */}
      <View
        style={{
          flexGrow: 1,
          flexBasis: 0,
          borderLeftWidth: 3,
          borderLeftColor: tema.cores.primaria,
          backgroundColor: tema.cores.fundoSuave,
          paddingVertical: tema.espaco(2.5),
          paddingHorizontal: tema.espaco(3),
        }}
      >
        <PdfRotulo tema={tema}>Cliente</PdfRotulo>
        <Text
          style={{
            fontFamily: tema.fonte,
            fontSize: tema.tamanho.lg,
            fontWeight: tema.pesos.semibold,
            color: tema.cores.texto,
            marginTop: 2,
            marginBottom: tema.espaco(1.5),
          }}
        >
          {cliente.nome}
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {cliente.documento && (
            <View style={{ width: "50%" }}>
              <PdfCampo tema={tema} rotulo="Documento" valor={cliente.documento} />
            </View>
          )}
          {cliente.telefone && (
            <View style={{ width: "50%" }}>
              <PdfCampo tema={tema} rotulo="Telefone" valor={cliente.telefone} />
            </View>
          )}
          {cliente.email && (
            <View style={{ width: "50%" }}>
              <PdfCampo tema={tema} rotulo="E-mail" valor={cliente.email} />
            </View>
          )}
        </View>
        {cliente.endereco && (
          <PdfCampo tema={tema} rotulo="Endereço da obra" valor={cliente.endereco} />
        )}
      </View>

      {/* Coluna de metadados. */}
      <View
        style={{
          width: 150,
          paddingVertical: tema.espaco(2.5),
          paddingHorizontal: tema.espaco(3),
          justifyContent: "center",
        }}
      >
        <PdfCampo tema={tema} rotulo="Data" valor={dataLabel} />
        <PdfCampo
          tema={tema}
          rotulo="Validade da proposta"
          valor={`${validadeDias} ${validadeDias === 1 ? "dia" : "dias"}`}
        />
        {consultor && (
          <PdfCampo tema={tema} rotulo="Consultor" valor={consultor} />
        )}
      </View>
    </View>
  );
}
