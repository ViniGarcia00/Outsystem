import { prisma } from "@/infrastructure/database";

import { getConfiguracao } from "./configuracao.service";
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
  const [p, config] = await Promise.all([
    prisma.proposta.findUnique({
      where: { id: propostaId },
      select: {
        proposalNumber: true,
        modelo: true,
        validadeDias: true,
        createdAt: true,
        emitidaAt: true,
        tipoDesconto: true,
        valorDesconto: true,
        frete: true,
        formaPagamento: true,
        previsaoInstalacao: true,
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
  ]);
  if (!p) return null;

  return montarPropostaPdfDTO(p, config);
}
