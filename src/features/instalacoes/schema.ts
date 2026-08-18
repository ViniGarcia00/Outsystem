import { z } from "zod";

import { requiredText } from "@/lib/validation";

/**
 * Schemas da Instalação (Sprint 4.0.1) — fonte única de validação, usada pelo
 * React Hook Form no cliente e pela Server Action no servidor.
 *
 * Responsável é TEXTO LIVRE (ADR-0400): não existe cadastro, então não há o que
 * validar além do tamanho. `responsavelAtual` é opcional na Instalação; o
 * responsável obrigatório do registro é assunto da Sprint 4.0.2.
 *
 * NENHUM campo de endereço é declarado aqui, de propósito (ADR-0400): o
 * endereço é derivado no service a partir do Cliente PERSISTIDO. Aceitar
 * endereço do navegador abriria a porta para um snapshot divergente do
 * cadastro — e o Zod, ao não declarar os campos, os descarta no parse.
 */

const STATUS = [
  "A_AGENDAR",
  "AGENDADA",
  "AGUARDANDO_MATERIAL",
  "EM_ANDAMENTO",
  "ADIADA",
  "CONCLUIDA",
  "CANCELADA",
] as const;

/** Texto opcional que nunca é `undefined`: vazio vira "". */
const texto = (max: number) =>
  z.string().trim().max(max, `Máximo de ${max} caracteres.`).default("");

const camposComuns = {
  nomeProjeto: requiredText("Nome do projeto", 200),
  propostaId: z.string().nullable().default(null),
  responsavelAtual: texto(120),
  status: z.enum(STATUS),
  dataPrevista: z.coerce.date().nullable().default(null),
  dataAgendada: z.coerce.date().nullable().default(null),
  periodo: texto(60),
  observacoes: texto(4000),
};

/** Criação: o cliente é obrigatório e não muda depois. */
export const novaInstalacaoSchema = z.object({
  clienteId: requiredText("Cliente", 40),
  ...camposComuns,
});

/** Edição do cabeçalho. O cliente e o endereço NÃO são editáveis. */
export const cabecalhoInstalacaoSchema = z.object(camposComuns);

export const cancelarInstalacaoSchema = z.object({
  motivo: texto(500),
});

export type NovaInstalacaoValues = z.infer<typeof novaInstalacaoSchema>;
export type CabecalhoInstalacaoValues = z.infer<
  typeof cabecalhoInstalacaoSchema
>;
export type CancelarInstalacaoValues = z.infer<
  typeof cancelarInstalacaoSchema
>;
