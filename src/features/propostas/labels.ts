import type {
  ModeloProposta,
  MotivoCancelamento,
  StatusProposta,
} from "@/services/proposta.service";

/** Rótulos e cores de exibição do domínio de propostas. */

export const STATUS_LABEL: Record<StatusProposta, string> = {
  RASCUNHO: "Rascunho",
  EMITIDA: "Emitida",
  APROVADA: "Aprovada",
  REPROVADA: "Reprovada",
  CANCELADA: "Cancelada",
};

/** Cor do badge por status (padrão ADR-0159). */
export const STATUS_BADGE_VARIANT: Record<
  StatusProposta,
  "secondary" | "info" | "success" | "danger" | "outline"
> = {
  RASCUNHO: "secondary",
  EMITIDA: "info",
  APROVADA: "success",
  REPROVADA: "danger",
  CANCELADA: "outline",
};

export const MODELO_LABEL: Record<ModeloProposta, string> = {
  COMERCIAL: "Comercial",
  SIMPLIFICADA: "Simplificada",
};

export const MOTIVO_LABEL: Record<MotivoCancelamento, string> = {
  CLIENTE_DESISTIU: "Cliente desistiu",
  CONCORRENCIA: "Concorrência",
  PROJETO_CANCELADO: "Projeto cancelado",
  ERRO_PROPOSTA: "Erro na proposta",
  PROPOSTA_SUBSTITUIDA: "Proposta substituída",
  OUTRO: "Outro",
};

export const MODELO_OPTIONS = (
  Object.keys(MODELO_LABEL) as ModeloProposta[]
).map((value) => ({ value, label: MODELO_LABEL[value] }));

export const MOTIVO_OPTIONS = (
  Object.keys(MOTIVO_LABEL) as MotivoCancelamento[]
).map((value) => ({ value, label: MOTIVO_LABEL[value] }));

/**
 * Status oferecidos no select do formulário a partir do status atual
 * (transições para frente; Cancelada nunca aqui — só via ação Cancelar).
 * ADR-0204.
 */
const TRANSICOES_FORM: Record<StatusProposta, StatusProposta[]> = {
  RASCUNHO: ["EMITIDA"],
  EMITIDA: ["APROVADA", "REPROVADA"],
  APROVADA: [],
  REPROVADA: [],
  CANCELADA: [],
};

export function statusOptionsFor(
  current: StatusProposta,
  isEdit: boolean,
): { value: string; label: string }[] {
  // No cadastro, a proposta nasce sempre Rascunho.
  const statuses: StatusProposta[] = isEdit
    ? [current, ...TRANSICOES_FORM[current]]
    : ["RASCUNHO"];
  return statuses.map((value) => ({ value, label: STATUS_LABEL[value] }));
}
