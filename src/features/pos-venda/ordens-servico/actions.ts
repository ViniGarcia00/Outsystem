"use server";

import { revalidatePath } from "next/cache";

import { dataHoraDeInput } from "@/features/instalacoes/datas";
import {
  registroPosVendaSchema,
  type RegistroPosVendaValues,
} from "@/features/pos-venda/registro-schema";
import { excluirAnexoPosVenda } from "@/services/pos-venda-anexo.service";
import {
  atualizarRegistroOS,
  criarRegistroOS,
  excluirRegistroOS,
} from "@/services/pos-venda-os-registro.service";
import {
  atualizarOrdemServico,
  cancelarOrdemServico,
  criarOSDaTroca,
  criarOrdemServico,
  finalizarOrdemServico,
  listOrdensServico,
  salvarItensOS,
  type OSListItem,
} from "@/services/pos-venda-os.service";
import { fail, ok, type ActionResult } from "@/types";

import { cabecalhoOSSchema, itensOSSchema, novaOSSchema } from "./schema";

/**
 * Server Actions da Ordem de Serviço de pós-venda (Sprint 4.6).
 *
 * Fronteira pública: valida a forma, converte a data-hora e traduz erro. As
 * regras — vínculo do mesmo cliente, cardinalidade, exigência técnica na
 * finalização — são todas do service.
 */

const LISTA = "/pos-venda/ordens-de-servico";
const workspace = (id: string) => `${LISTA}/${id}`;
const TROCAS = "/pos-venda/trocas-antecipadas";
const workspaceTroca = (id: string) => `${TROCAS}/${id}`;

const DADOS_INVALIDOS = "Dados inválidos. Verifique os campos destacados.";

const mensagem = (error: unknown, padrao: string): string =>
  error instanceof Error ? error.message : padrao;

export async function listOrdensServicoAction(): Promise<OSListItem[]> {
  return listOrdensServico();
}

export async function criarOrdemServicoAction(
  values: unknown,
): Promise<ActionResult<{ id: string; numero: number }>> {
  const parsed = novaOSSchema.safeParse(values);
  if (!parsed.success) return fail(DADOS_INVALIDOS);
  try {
    const criada = await criarOrdemServico(parsed.data);
    revalidatePath(LISTA);
    // A Troca vinculada ganha o link para a OS no workspace dela.
    if (parsed.data.trocaAntecipadaId) {
      revalidatePath(workspaceTroca(parsed.data.trocaAntecipadaId));
    }
    return ok(criada);
  } catch (error) {
    return fail(mensagem(error, "Falha ao salvar."));
  }
}

export async function atualizarOrdemServicoAction(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = cabecalhoOSSchema.safeParse(values);
  if (!parsed.success) return fail(DADOS_INVALIDOS);
  try {
    await atualizarOrdemServico(id, parsed.data);
    revalidatePath(LISTA);
    revalidatePath(workspace(id));
    return ok(undefined);
  } catch (error) {
    return fail(mensagem(error, "Falha ao salvar."));
  }
}

export async function salvarItensOSAction(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = itensOSSchema.safeParse(values);
  if (!parsed.success) return fail(DADOS_INVALIDOS);
  try {
    await salvarItensOS(id, parsed.data.itens);
    revalidatePath(LISTA);
    revalidatePath(workspace(id));
    return ok(undefined);
  } catch (error) {
    return fail(mensagem(error, "Falha ao salvar os produtos."));
  }
}

/**
 * Finaliza. Sem parâmetro de confirmação, ao contrário da Troca: a guarda de
 * informação técnica (ADR-0420) não é uma confirmação a pular — "consertamos e
 * ninguém sabe o quê" não é um desfecho legítimo, é informação perdida. A
 * mensagem do service diz exatamente o que falta preencher.
 */
export async function finalizarOrdemServicoAction(
  id: string,
): Promise<ActionResult> {
  try {
    await finalizarOrdemServico(id);
    revalidatePath(LISTA);
    revalidatePath(workspace(id));
    return ok(undefined);
  } catch (error) {
    return fail(mensagem(error, "Falha ao finalizar."));
  }
}

export async function cancelarOrdemServicoAction(
  id: string,
  motivo: string,
): Promise<ActionResult> {
  try {
    await cancelarOrdemServico(id, motivo);
    revalidatePath(LISTA);
    revalidatePath(workspace(id));
    return ok(undefined);
  } catch (error) {
    return fail(mensagem(error, "Falha ao cancelar."));
  }
}

/**
 * Abre uma OS a partir de uma Troca, pré-preenchida (spec §27).
 *
 * Conveniência, não requisito de aceite. O que ela grava é um **snapshot**
 * (ADR-0419): alterações posteriores na Troca não chegam à OS, e não há código
 * de sincronização para desligar.
 */
export async function criarOSDaTrocaAction(
  trocaId: string,
): Promise<ActionResult<{ id: string; numero: number }>> {
  try {
    const criada = await criarOSDaTroca(trocaId);
    revalidatePath(LISTA);
    revalidatePath(TROCAS);
    revalidatePath(workspaceTroca(trocaId));
    return ok(criada);
  } catch (error) {
    // "Nenhum produto devolvido ainda" é a mensagem que o usuário precisa ler.
    return fail(mensagem(error, "Falha ao abrir a ordem de serviço."));
  }
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

function paraInput(values: RegistroPosVendaValues) {
  const dataHora = dataHoraDeInput(values.dataHora);
  if (!dataHora) throw new Error("Data do acontecimento inválida.");
  return { ...values, dataHora };
}

export async function criarRegistroOSAction(
  osId: string,
  values: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = registroPosVendaSchema.safeParse(values);
  if (!parsed.success) return fail(DADOS_INVALIDOS);
  try {
    const criado = await criarRegistroOS(osId, paraInput(parsed.data));
    revalidatePath(workspace(osId));
    return ok(criado);
  } catch (error) {
    return fail(mensagem(error, "Falha ao salvar."));
  }
}

export async function atualizarRegistroOSAction(
  osId: string,
  registroId: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = registroPosVendaSchema.safeParse(values);
  if (!parsed.success) return fail(DADOS_INVALIDOS);
  try {
    await atualizarRegistroOS(osId, registroId, paraInput(parsed.data));
    revalidatePath(workspace(osId));
    return ok(undefined);
  } catch (error) {
    return fail(mensagem(error, "Falha ao salvar."));
  }
}

export async function excluirRegistroOSAction(
  osId: string,
  registroId: string,
): Promise<ActionResult> {
  try {
    await excluirRegistroOS(osId, registroId);
    revalidatePath(workspace(osId));
    return ok(undefined);
  } catch (error) {
    return fail(mensagem(error, "Falha ao excluir."));
  }
}

export async function excluirAnexoOSAction(
  osId: string,
  registroId: string,
  anexoId: string,
): Promise<ActionResult> {
  try {
    await excluirAnexoPosVenda("OS", osId, registroId, anexoId);
    revalidatePath(workspace(osId));
    return ok(undefined);
  } catch (error) {
    return fail(mensagem(error, "Falha ao excluir o anexo."));
  }
}
