import { Text, View } from "@react-pdf/renderer";

import type { PdfCliente } from "@/services/proposta-pdf.mapper";

import { PdfCampo, PdfRotulo } from "../primitives";
import type { Tema } from "../theme";

/**
 * Bloco do cliente (endereço da obra = endereço do cliente). Elegante, com boa
 * hierarquia visual — NÃO é tabela. À direita, metadados: data, validade e
 * consultor responsável.
 *
 * No PDF Contratual (`contratual`) a identificação do contratante adapta os
 * documentos ao tipo de pessoa (Sprint 2.10.2): PF → CPF + RG; PJ → CNPJ +
 * Inscrição Estadual. Campos secundários ausentes são simplesmente ocultados
 * (sem "—"/"N/A"). Mesmo padrão visual; só muda o conjunto de campos.
 */
export function PdfCliente({
  tema,
  cliente,
  consultor,
  dataLabel,
  validadeDias,
  contratual = false,
}: {
  tema: Tema;
  cliente: PdfCliente;
  consultor: string | null;
  dataLabel: string;
  validadeDias: number;
  contratual?: boolean;
}) {
  // Documentos exibidos conforme o tipo de pessoa (só no Contratual); no
  // Detalhado mantém-se o rótulo genérico "Documento". Opcionais vazios saem
  // da lista (ocultados). `documento` = CPF (PF) ou CNPJ (PJ).
  const documentoLabel = contratual
    ? cliente.tipoPessoa === "PJ"
      ? "CNPJ"
      : "CPF"
    : "Documento";
  const campos: { rotulo: string; valor: string }[] = [];
  if (cliente.documento)
    campos.push({ rotulo: documentoLabel, valor: cliente.documento });
  if (contratual) {
    if (cliente.tipoPessoa === "PJ") {
      if (cliente.inscricaoEstadual)
        campos.push({
          rotulo: "Inscrição Estadual",
          valor: cliente.inscricaoEstadual,
        });
    } else if (cliente.rg) {
      campos.push({ rotulo: "RG", valor: cliente.rg });
    }
  }
  if (cliente.telefone)
    campos.push({ rotulo: "Telefone", valor: cliente.telefone });
  if (cliente.email) campos.push({ rotulo: "E-mail", valor: cliente.email });
  const enderecoLabel = contratual ? "Endereço" : "Endereço da obra";

  return (
    <View
      wrap={false}
      style={{
        flexDirection: "row",
        marginTop: tema.espaco(1.5),
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
          {campos.map((c) => (
            <View key={c.rotulo} style={{ width: "50%" }}>
              <PdfCampo tema={tema} rotulo={c.rotulo} valor={c.valor} />
            </View>
          ))}
        </View>
        {cliente.endereco && (
          <PdfCampo tema={tema} rotulo={enderecoLabel} valor={cliente.endereco} />
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
