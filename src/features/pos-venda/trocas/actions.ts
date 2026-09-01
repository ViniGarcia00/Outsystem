"use server";

import { revalidatePath } from "next/cache";

import { dataHoraDeInput } from "@/features/instalacoes/datas";
import {
  registroPosVendaSchema,
  type RegistroPosVendaValues,
} from "@/features/pos-venda/registro-schema";
import { excluirAnexoPosVenda } from "@/services/pos-venda-anexo.service";
import {
  atualizarRegistroTroca,
  criarRegistroTroca,
  excluirRegistroTroca,
} from "@/services/pos-venda-troca-registro.service";
import {
  atualizarTroca,
  cancelarTroca,
  criarTroca,
  finalizarTroca,
  listTrocas,
  listTrocasVinculaveis,
  pendenciasDaTroca,
  salvarItensTroca,
  type PendenciaRetorno,
  type TrocaListItem,
  type TrocaSuggestion,
} from "@/services/pos-venda-troca.service";
import { fail, ok, type ActionResult } from "@/types";

import {
  cabecalhoTrocaSchema,
  itensTrocaSchema,
  novaTrocaSchema,
} from "./schema";

/**
 * Server Actions da Troca Antecipada (Sprint 4.6).
 *
 * Fronteira pública: valida a forma, converte a data-hora e traduz erro. As
 * REGRAS vivem no service — inclusive as que o Zod também checa. A action nunca
 * é a última linha de defesa.
 */

const LISTA = "/pos-venda/trocas-antecipadas";
const workspace = (id: string) => `${LISTA}/${id}`;

const DADOS_INVALIDOS = "Dados inválidos. Verifique os campos destacados.";

/** Mensagem do erro, sem vazar stack nem detalhe interno. */
const mensagem = (error: unknown, padrao: string): string =>
  error instanceof Error ? error.message : padrao;

export async function listTrocasAction(): Promise<TrocaListItem[]> {
  return listTrocas();
}

export async function listTrocasVinculaveisAction(
  clienteId: string,
): Promise<TrocaSuggestion[]> {
  return listTrocasVinculaveis(clienteId);
}

export async function criarTrocaAction(
  values: unknown,
): Promise<ActionResult<{ id: string; numero: number }>> {
  const parsed = novaTrocaSchema.safeParse(values);
  if (!parsed.success) return fail(DADOS_INVALIDOS);
  try {
    const criada = await criarTroca(parsed.data);
    revalidatePath(LISTA);
    return ok(criada);
  } catch (error) {
    return fail(mensagem(error, "Falha ao salvar."));
  }
}

export async function atualizarTrocaAction(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = cabecalhoTrocaSchema.safeParse(values);
  if (!parsed.success) return fail(DADOS_INVALIDOS);
  try {
    await atualizarTroca(id, parsed.data);
    revalidatePath(LISTA);
    revalidatePath(workspace(id));
    return ok(undefined);
  } catch (error) {
    return fail(mensagem(error, "Falha ao salvar."));
  }
}

export async function salvarItensTrocaAction(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = itensTrocaSchema.safeParse(values);
  if (!parsed.success) return fail(DADOS_INVALIDOS);
  try {
    await salvarItensTroca(id, parsed.data.itens);
    revalidatePath(LISTA);
    revalidatePath(workspace(id));
    return ok(undefined);
  } catch (error) {
    return fail(mensagem(error, "Falha ao salvar os produtos."));
  }
}

/**
 * Pendências de retorno, para o diálogo de confirmação forte.
 *
 * Consultada ANTES de finalizar: é o que permite ao usuário ver item a item o
 * que ainda não voltou, em vez de receber um "tem certeza?" sem contexto.
 */
export async function pendenciasDaTrocaAction(
  id: string,
): Promise<PendenciaRetorno[]> {
  return pendenciasDaTroca(id);
}

/**
 * Finaliza. `confirmarPendencia` vem do diálogo — o service recusa sem ela
 * quando há item pendente, e a recusa não é um bug: é a confirmação forte da
 * spec §12 funcionando.
 */
export async function finalizarTrocaAction(
  id: string,
  confirmarPendencia: boolean,
): Promise<ActionResult> {
  try {
    await finalizarTroca(id, confirmarPendencia);
    revalidatePath(LISTA);
    revalidatePath(workspace(id));
    return ok(undefined);
  } catch (error) {
    return fail(mensagem(error, "Falha ao finalizar."));
  }
}

export async function cancelarTrocaAction(
  id: string,
  motivo: string,
): Promise<ActionResult> {
  try {
    await cancelarTroca(id, motivo);
    revalidatePath(LISTA);
    revalidatePath(workspace(id));
    return ok(undefined);
  } catch (error) {
    return fail(mensagem(error, "Falha ao cancelar."));
  }
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

/**
 * Converte a data-hora do formulário; o schema já garantiu o formato.
 *
 * A conversão acontece aqui, não no Zod: transformar no schema faria o tipo de
 * entrada divergir do de saída, e o React Hook Form manipula o de entrada.
 */
function paraInput(values: RegistroPosVendaValues) {
  const dataHora = dataHoraDeInput(values.dataHora);
  if (!dataHora) throw new Error("Data do acontecimento inválida.");
  return { ...values, dataHora };
}

export async function criarRegistroTrocaAction(
  trocaId: string,
  values: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = registroPosVendaSchema.safeParse(values);
  if (!parsed.success) return fail(DADOS_INVALIDOS);
  try {
    const criado = await criarRegistroTroca(trocaId, paraInput(parsed.data));
    revalidatePath(workspace(trocaId));
    return ok(criado);
  } catch (error) {
    return fail(mensagem(error, "Falha ao salvar."));
  }
}

export async function atualizarRegistroTrocaAction(
  trocaId: string,
  registroId: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = registroPosVendaSchema.safeParse(values);
  if (!parsed.success) return fail(DADOS_INVALIDOS);
  try {
    await atualizarRegistroTroca(trocaId, registroId, paraInput(parsed.data));
    revalidatePath(workspace(trocaId));
    return ok(undefined);
  } catch (error) {
    return fail(mensagem(error, "Falha ao salvar."));
  }
}

export async function excluirRegistroTrocaAction(
  trocaId: string,
  registroId: string,
): Promise<ActionResult> {
  try {
    await excluirRegistroTroca(trocaId, registroId);
    revalidatePath(workspace(trocaId));
    return ok(undefined);
  } catch (error) {
    // A mensagem do bloqueio por custos chega ao usuário como está.
    return fail(mensagem(error, "Falha ao excluir."));
  }
}

/**
 * Exclusão de anexo. Continua Server Action, ao contrário do upload: só apaga
 * uma linha e dispara um `unlink` — não há corpo grande, então o limite de 1 MB
 * que forçou o Route Handler no upload não se aplica aqui.
 */
export async function excluirAnexoTrocaAction(
  trocaId: string,
  registroId: string,
  anexoId: string,
): Promise<ActionResult> {
  try {
    await excluirAnexoPosVenda("TROCA", trocaId, registroId, anexoId);
    revalidatePath(workspace(trocaId));
    return ok(undefined);
  } catch (error) {
    return fail(mensagem(error, "Falha ao excluir o anexo."));
  }
}
