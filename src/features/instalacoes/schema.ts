import { z } from "zod";

import { requiredText } from "@/lib/validation";

import { ehDataDeInputValida } from "./datas";

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

/**
 * Texto opcional. Sem `.default()` de propósito: o default tornaria o campo
 * opcional no tipo de ENTRADA, e o formulário sempre fornece "" — deixar o tipo
 * exigir a chave evita divergência entre o que o RHF manipula e o que o schema
 * declara.
 */
const texto = (max: number) =>
  z.string().trim().max(max, `Máximo de ${max} caracteres.`);

/**
 * Data vinda de `<input type="date">`: "YYYY-MM-DD" ou "".
 *
 * O schema apenas VALIDA o formato e mantém o valor como texto — a conversão
 * para `Date` acontece na Server Action, com `dataDeInput`. Transformar aqui
 * faria o tipo de entrada divergir do de saída, e o React Hook Form manipula o
 * de entrada: a divergência contamina toda a tipagem do formulário sem trazer
 * nenhuma garantia extra.
 */
const dataOpcional = z
  .string()
  .trim()
  .refine(ehDataDeInputValida, "Data inválida.");

const camposComuns = {
  propostaId: z.string().nullable(),
  responsavelAtual: texto(120),
  status: z.enum(STATUS),
  dataPrevista: dataOpcional,
  dataAgendada: dataOpcional,
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

/** Datas continuam como texto — a conversão é da Server Action. */
export type NovaInstalacaoValues = z.infer<typeof novaInstalacaoSchema>;
export type CabecalhoInstalacaoValues = z.infer<
  typeof cabecalhoInstalacaoSchema
>;
export type CancelarInstalacaoValues = z.infer<
  typeof cancelarInstalacaoSchema
>;
