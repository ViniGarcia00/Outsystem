import { z } from "zod";

import { STATUS_OS_ORDER } from "@/features/pos-venda/labels";
import { requiredText } from "@/lib/validation";

/**
 * Schemas da Ordem de Serviço de pós-venda (Sprint 4.6).
 *
 * A criação MANUAL é o fluxo obrigatório (spec §24) e é este schema que a
 * governa: cliente, referência, responsável, relato, status e **produtos**.
 *
 * O vínculo com a Troca é opcional em todo lugar — inclusive aqui.
 */

const STATUS = STATUS_OS_ORDER as [
  (typeof STATUS_OS_ORDER)[number],
  ...(typeof STATUS_OS_ORDER)[number][],
];

const texto = (max: number) =>
  z.string().trim().max(max, `Máximo de ${max} caracteres.`);

/**
 * Item da OS.
 *
 * `quantidade` é inteiro ESTRITAMENTE positivo — diferente da Troca, onde zero
 * é um estado real ("nada devolvido ainda"). Um item de OS com quantidade zero
 * não é um item.
 *
 * `diagnosticoItem` e `solucaoItem` são opcionais **durante a execução**; a
 * exigência de informação técnica é da FINALIZAÇÃO (ADR-0420) e mora no
 * service, não aqui: exigi-los no schema impediria de cadastrar o produto antes
 * de analisá-lo, que é exatamente a ordem em que o trabalho acontece.
 */
export const itemOSSchema = z
  .object({
    id: z.string().nullable(),
    produtoId: z.string().nullable(),
    descricaoManual: texto(200),
    quantidade: z
      .number({ message: "Informe a quantidade como número inteiro." })
      .int("A quantidade deve ser um número inteiro.")
      .positive("A quantidade deve ser maior que zero."),
    diagnosticoItem: texto(2000),
    solucaoItem: texto(2000),
  })
  .superRefine((item, ctx) => {
    if (!item.produtoId?.trim() && !item.descricaoManual.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["descricaoManual"],
        message: "Selecione um produto ou informe a descrição.",
      });
    }
  });

export const novaOSSchema = z.object({
  clienteId: requiredText("Cliente", 40),
  /** Opcional. Quando informado, o service exige que seja do MESMO cliente. */
  trocaAntecipadaId: z.string().nullable(),
  referencia: requiredText("Referência", 120),
  responsavelId: z.string().nullable(),
  relatoInicial: texto(4000),
  status: z.enum(STATUS),
  /**
   * Ao menos um produto na criação: uma OS de pós-venda nasce porque ALGO
   * chegou para análise, e uma OS sem produto não descreve trabalho nenhum.
   */
  itens: z.array(itemOSSchema).min(1, "Adicione pelo menos um produto."),
});

/**
 * Edição do cabeçalho. **Nem o cliente nem o vínculo com a Troca entram**: os
 * dois são definidos na criação.
 *
 * O vínculo especificamente — torná-lo editável transformaria a origem, que é
 * um fato histórico ("esta OS nasceu daquela troca"), em campo mutável, e o
 * snapshot dos itens deixaria de corresponder à troca apontada.
 */
export const cabecalhoOSSchema = z.object({
  referencia: requiredText("Referência", 120),
  responsavelId: z.string().nullable(),
  relatoInicial: texto(4000),
  status: z.enum(STATUS),
  diagnosticoConclusao: texto(4000),
});

export const itensOSSchema = z.object({
  itens: z.array(itemOSSchema),
});

export type NovaOSValues = z.infer<typeof novaOSSchema>;
export type CabecalhoOSValues = z.infer<typeof cabecalhoOSSchema>;
export type ItemOSValues = z.infer<typeof itemOSSchema>;
export type ItensOSValues = z.infer<typeof itensOSSchema>;
