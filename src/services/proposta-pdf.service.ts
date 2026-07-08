import { prisma } from "@/infrastructure/database";

import { getConfiguracao } from "./configuracao.service";
import { readLogoFile } from "./logo.service";
import { montarPropostaPdfDTO, type PropostaPdfDTO } from "./proposta-pdf.mapper";

/**
 * Camada de LEITURA (IO) do documento comercial (PDF). A montagem do DTO fica no
 * mapper puro (`proposta-pdf.mapper.ts`), testável sem banco.
 */

export * from "./proposta-pdf.mapper";

/**
 * Monta o DTO do PDF para uma proposta. Renderiza sempre a `currentRevision`
 * (para EMITIDA = revisão congelada). Retorna null se a proposta não existir.
 */
export async function getPropostaPdfData(
  propostaId: string,
): Promise<PropostaPdfDTO | null> {
  const [p, config, logoFile] = await Promise.all([
    prisma.proposta.findUnique({
      where: { id: propostaId },
      select: {
        proposalNumber: true,
        nomeProjeto: true,
        modelo: true,
        validadeDias: true,
        createdAt: true,
        emitidaAt: true,
        tipoDesconto: true,
        valorDesconto: true,
        frete: true,
        formaPagamento: true,
        previsaoInstalacao: true,
        obsProposta: true,
        obsComerciais: true,
        obsTecnicas: true,
        cliente: {
          select: {
            tipoPessoa: true,
            nome: true,
            empresa: true,
            cpfCnpj: true,
            telefone: true,
            email: true,
            endereco: true,
            numero: true,
            complemento: true,
            bairro: true,
            cidade: true,
            estado: true,
            cep: true,
          },
        },
        vendedor: { select: { nome: true } },
        // Serviços complementares (Sprint 2.9.3) — para os slides Som/Wi-Fi do
        // PDF Apresentação. `valorTotal` já persistido (produtos + serviços).
        servicos: {
          orderBy: { ordem: "asc" },
          select: { tipo: true, descricao: true, valorTotal: true },
        },
        currentRevision: {
          select: {
            revisionNumber: true,
            emittedAt: true,
            secoes: {
              orderBy: { ordem: "asc" },
              select: {
                nome: true,
                itens: {
                  orderBy: { ordem: "asc" },
                  select: {
                    codigo: true,
                    descricao: true,
                    unidade: true,
                    quantidade: true,
                    valorProduto: true,
                    valorServico: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    getConfiguracao(),
    readLogoFile(),
  ]);
  if (!p) return null;

  const dto = montarPropostaPdfDTO(p, config);
  // Embute o logo como DATA URI (base64). Evita ambiguidade de caminho de
  // arquivo no Windows (o @react-pdf não resolvia o path absoluto) e garante a
  // renderização; fallback textual quando não há logo.
  dto.empresa.logo = logoFile
    ? `data:${logoFile.contentType};base64,${logoFile.data.toString("base64")}`
    : null;
  return dto;
}
