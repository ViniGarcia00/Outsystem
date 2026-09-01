import { z } from "zod";

import {
  dataHoraDeInput,
  ehDataHoraDeInputValida,
} from "@/features/instalacoes/datas";
import { requiredText } from "@/lib/validation";

import { CATEGORIAS_CUSTO } from "./labels";

/**
 * Schema do registro de timeline do Pós-venda — o MESMO para Troca e OS
 * (Sprint 4.6).
 *
 * Um registro dos dois submódulos tem exatamente a mesma forma: quando
 * aconteceu, quem fez, o que aconteceu e quanto custou. Dois schemas idênticos
 * seriam duas cópias para manter em dia sem nenhuma regra distinta a expressar.
 *
 * ── FUSO: REUSO, NÃO CÓPIA ──────────────────────────────────────────────────
 * As conversões de data-hora vêm de `@/features/instalacoes/datas`, que fixa
 * `America/Sao_Paulo`. Aquele módulo documenta exatamente por que não se deve
 * declarar o fuso brasileiro em dois lugares: a mudança passaria despercebida
 * em um deles. Importar de outra feature é o padrão vigente do projeto
 * (`instalacao.service.ts` importa de `features/usuarios/opcoes`).
 *
 * A data-hora permanece TEXTO aqui, como no schema da cronologia: transformar
 * no Zod faria o tipo de entrada divergir do de saída, e o React Hook Form
 * manipula o de entrada. A conversão é da Server Action.
 *
 * ── CATEGORIA DE CUSTO ──────────────────────────────────────────────────────
 * O schema aceita a enum INTEIRA. A separação entre custos de envio (Troca) e
 * de reparo (OS) é da interface, em `CATEGORIAS_CUSTO_TROCA` /
 * `CATEGORIAS_CUSTO_OS` (ADR-0418) — é decisão de vocabulário, não invariante
 * de integridade. Recusar `PECA` numa Troca no servidor não protegeria nada:
 * seria só um custo classificado de forma estranha, e a enum do banco já
 * garante que o valor existe.
 */

const CATEGORIAS = CATEGORIAS_CUSTO as [
  (typeof CATEGORIAS_CUSTO)[number],
  ...(typeof CATEGORIAS_CUSTO)[number][],
];

export const custoPosVendaSchema = z.object({
  categoria: z.enum(CATEGORIAS),
  descricao: z.string().trim().max(200, "Máximo de 200 caracteres."),
  /** Estritamente maior que zero: custo zerado não é custo. */
  valor: z
    .number({ message: "Informe um valor válido." })
    .positive("O valor deve ser maior que zero."),
});

export const registroPosVendaSchema = z.object({
  dataHora: z
    .string()
    .trim()
    .refine(ehDataHoraDeInputValida, "Informe a data e a hora do acontecimento.")
    // Fatos históricos são permitidos; fatos futuros, não — ainda não ocorreram.
    .refine((v) => {
      const d = dataHoraDeInput(v);
      return d !== null && d.getTime() <= Date.now();
    }, "O acontecimento não pode estar no futuro."),
  responsavelId: requiredText("Responsável", 40),
  relato: requiredText("Relato", 5000),
  custos: z.array(custoPosVendaSchema),
});

export type CustoPosVendaValues = z.infer<typeof custoPosVendaSchema>;
export type RegistroPosVendaValues = z.infer<typeof registroPosVendaSchema>;

/** Motivo do cancelamento — opcional, vai para a auditoria. */
export const cancelarPosVendaSchema = z.object({
  motivo: z.string().trim().max(500, "Máximo de 500 caracteres."),
});

export type CancelarPosVendaValues = z.infer<typeof cancelarPosVendaSchema>;
