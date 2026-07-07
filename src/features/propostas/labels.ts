import type {
  ModeloProposta,
  MotivoCancelamento,
  StatusProposta,
} from "@/services/proposta.service";

/** Rótulos e cores de exibição do domínio de propostas. */

export const STATUS_LABEL: Record<StatusProposta, string> = {
  RASCUNHO: "Rascunho",
  EMITIDA: "Emitida",
  CANCELADA: "Cancelada",
};

/** Cor do badge por status (padrão ADR-0159). */
export const STATUS_BADGE_VARIANT: Record<
  StatusProposta,
  "secondary" | "info" | "outline"
> = {
  RASCUNHO: "secondary",
  EMITIDA: "info",
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
