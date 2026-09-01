import { z } from "zod";

import {
  DESTINATARIO_ORDER,
  STATUS_TROCA_ORDER,
  exigeDestinatarioNome,
} from "@/features/pos-venda/labels";
import { requiredText } from "@/lib/validation";

/**
 * Schemas da Troca Antecipada (Sprint 4.6) — fonte única de validação, usada
 * pelo React Hook Form no cliente e pela Server Action no servidor.
 *
 * As listas de valores vêm de `labels.ts`, não são reescritas aqui: um status
 * novo entra em um lugar só, e o typecheck do `Record` de rótulos garante que
 * nenhum fique sem texto.
 *
 * **A regra do destinatário é validada aqui E no service.** A do Zod dá a
 * mensagem no campo certo do formulário; a do service é a que vale, porque a
 * action é fronteira pública e integridade não pode depender de quem chamou.
 */

const STATUS = STATUS_TROCA_ORDER as [
  (typeof STATUS_TROCA_ORDER)[number],
  ...(typeof STATUS_TROCA_ORDER)[number][],
];

const DESTINATARIOS = DESTINATARIO_ORDER as [
  (typeof DESTINATARIO_ORDER)[number],
  ...(typeof DESTINATARIO_ORDER)[number][],
];

/**
 * Texto opcional. Sem `.default()` de propósito: o default tornaria o campo
 * opcional no tipo de ENTRADA, e o formulário sempre fornece "" — deixar o tipo
 * exigir a chave evita divergência entre o que o RHF manipula e o que o schema
 * declara. Mesma decisão de `features/instalacoes/schema.ts`.
 */
const texto = (max: number) =>
  z.string().trim().max(max, `Máximo de ${max} caracteres.`);

const destinatario = {
  destinatarioTipo: z.enum(DESTINATARIOS),
  destinatarioNome: texto(120),
};

/**
 * `INSTALADOR` e `OUTRO` exigem o nome; `CLIENTE` não, porque a própria Troca
 * já aponta para o Cliente. O `superRefine` fixa o erro no CAMPO do nome — uma
 * mensagem no topo do formulário deixaria o usuário procurando o que preencher.
 */
const exigirNomeQuandoNecessario = (
  valores: { destinatarioTipo: string; destinatarioNome: string },
  ctx: z.RefinementCtx,
) => {
  if (
    exigeDestinatarioNome(
      valores.destinatarioTipo as (typeof DESTINATARIO_ORDER)[number],
    ) &&
    !valores.destinatarioNome.trim()
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["destinatarioNome"],
      message: "Informe para quem o produto foi enviado.",
    });
  }
};

/**
 * Criação. Cliente é obrigatório e não muda depois — como na Instalação, o
 * vínculo é definido aqui.
 *
 * `diagnosticoConclusao` NÃO entra: é conclusão, e ninguém conclui uma troca no
 * momento em que a abre. O Zod, ao não declarar o campo, o descarta no parse.
 */
export const novaTrocaSchema = z
  .object({
    clienteId: requiredText("Cliente", 40),
    referencia: requiredText("Referência", 120),
    responsavelId: z.string().nullable(),
    relatoInicial: texto(4000),
    status: z.enum(STATUS),
    ...destinatario,
  })
  .superRefine(exigirNomeQuandoNecessario);

/** Edição do cabeçalho. O cliente NÃO é editável. */
export const cabecalhoTrocaSchema = z
  .object({
    referencia: requiredText("Referência", 120),
    responsavelId: z.string().nullable(),
    relatoInicial: texto(4000),
    status: z.enum(STATUS),
    ...destinatario,
    diagnosticoConclusao: texto(4000),
  })
  .superRefine(exigirNomeQuandoNecessario);

/**
 * Item da grade de produtos.
 *
 * As quantidades são inteiros >= 0. A comparação `devolvida <= esperada` fica
 * no `superRefine` da linha, com o erro apontando para o campo devolvida — é
 * ele que o usuário acabou de digitar.
 *
 * A regra XOR (`produtoId` OU `descricaoManual`) também é de linha: sem ela,
 * uma linha em branco viraria um item sem identificação nenhuma.
 */
const quantidade = (label: string) =>
  z
    .number({ message: `Informe ${label} como número inteiro.` })
    .int(`${label} deve ser um número inteiro.`)
    .min(0, `${label} não pode ser negativa.`);

export const itemTrocaSchema = z
  .object({
    /** Ausente na linha nova; presente na existente (reconciliação por id). */
    id: z.string().nullable(),
    produtoId: z.string().nullable(),
    descricaoManual: texto(200),
    quantidadeEnviada: quantidade("a quantidade enviada"),
    quantidadeEsperadaRetorno: quantidade("a quantidade esperada"),
    quantidadeDevolvida: quantidade("a quantidade devolvida"),
  })
  .superRefine((item, ctx) => {
    if (!item.produtoId?.trim() && !item.descricaoManual.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["descricaoManual"],
        message: "Selecione um produto ou informe a descrição.",
      });
    }
    if (item.quantidadeDevolvida > item.quantidadeEsperadaRetorno) {
      ctx.addIssue({
        code: "custom",
        path: ["quantidadeDevolvida"],
        message: "Não pode ser maior que a quantidade esperada.",
      });
    }
  });

export const itensTrocaSchema = z.object({
  itens: z.array(itemTrocaSchema),
});

export type NovaTrocaValues = z.infer<typeof novaTrocaSchema>;
export type CabecalhoTrocaValues = z.infer<typeof cabecalhoTrocaSchema>;
export type ItemTrocaValues = z.infer<typeof itemTrocaSchema>;
export type ItensTrocaValues = z.infer<typeof itensTrocaSchema>;
