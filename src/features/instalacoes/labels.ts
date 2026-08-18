import type { CategoriaCustoInstalacao } from "./custos";

/**
 * Rótulos e cores de Instalação (Sprint 4.0.1). Fonte única — a UI nunca
 * escreve o texto de um status à mão.
 *
 * O tipo espelha o enum `StatusInstalacao` do Prisma. Acrescentar um valor lá
 * quebra este arquivo no typecheck, que é o comportamento desejado.
 *
 * NOTA — divergência consciente de `features/propostas/labels.ts`: lá o tipo
 * `StatusProposta` mora no service e o labels o importa. Aqui é o inverso,
 * porque este arquivo é criado antes do service e é o único lugar em que o
 * conjunto de status precisa estar completo (rótulo + cor + ordem). O service
 * importa daqui. NÃO declarar o tipo nos dois lugares — duplicar faria um status
 * novo passar despercebido pelo typecheck em um deles.
 */

export type StatusInstalacao =
  | "A_AGENDAR"
  | "AGENDADA"
  | "AGUARDANDO_MATERIAL"
  | "EM_ANDAMENTO"
  | "ADIADA"
  | "CONCLUIDA"
  | "CANCELADA";

export const STATUS_LABEL: Record<StatusInstalacao, string> = {
  A_AGENDAR: "A agendar",
  AGENDADA: "Agendada",
  AGUARDANDO_MATERIAL: "Aguardando material",
  EM_ANDAMENTO: "Em andamento",
  ADIADA: "Adiada",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

/** Ordem de exibição no filtro — do início ao fim do ciclo operacional. */
export const STATUS_ORDER: StatusInstalacao[] = [
  "A_AGENDAR",
  "AGENDADA",
  "AGUARDANDO_MATERIAL",
  "EM_ANDAMENTO",
  "ADIADA",
  "CONCLUIDA",
  "CANCELADA",
];

/** Cores seguem o padrão do projeto (ADR-0159): verde = ok, vermelho = fim. */
export const STATUS_BADGE_VARIANT: Record<
  StatusInstalacao,
  "secondary" | "info" | "warning" | "success" | "danger"
> = {
  A_AGENDAR: "secondary",
  AGENDADA: "info",
  AGUARDANDO_MATERIAL: "warning",
  EM_ANDAMENTO: "info",
  ADIADA: "warning",
  CONCLUIDA: "success",
  CANCELADA: "danger",
};

// ---------------------------------------------------------------------------
// Cronologia e custos (Sprint 4.0.2)
// ---------------------------------------------------------------------------

export type TipoRegistroInstalacao =
  | "VISITA_CLIENTE"
  | "ATUALIZACAO_INTERNA"
  | "MATERIAL_COMPRADO"
  | "ALTERACAO_ESCOPO"
  | "PENDENCIA"
  | "CONCLUSAO"
  | "OUTRO";

export const TIPO_REGISTRO_LABEL: Record<TipoRegistroInstalacao, string> = {
  VISITA_CLIENTE: "Visita ao cliente",
  ATUALIZACAO_INTERNA: "Atualização interna",
  MATERIAL_COMPRADO: "Material comprado",
  ALTERACAO_ESCOPO: "Alteração de escopo",
  PENDENCIA: "Pendência",
  CONCLUSAO: "Conclusão",
  OUTRO: "Outro",
};

/** Ordem de exibição no seletor — do mais frequente ao genérico. */
export const TIPOS_REGISTRO_ORDER: TipoRegistroInstalacao[] = [
  "VISITA_CLIENTE",
  "ATUALIZACAO_INTERNA",
  "MATERIAL_COMPRADO",
  "ALTERACAO_ESCOPO",
  "PENDENCIA",
  "CONCLUSAO",
  "OUTRO",
];

/**
 * O tipo `CategoriaCustoInstalacao` mora em `custos.ts` (onde é usado pelo
 * cálculo). Aqui só os rótulos — declarar o tipo de novo faria uma categoria
 * nova passar despercebida pelo typecheck em um dos dois arquivos.
 */
export const CATEGORIA_CUSTO_LABEL: Record<CategoriaCustoInstalacao, string> = {
  MATERIAL: "Material",
  MAO_DE_OBRA: "Mão de obra",
  DESLOCAMENTO: "Deslocamento",
  TERCEIROS: "Terceiros",
  FRETE: "Frete",
  OUTROS: "Outros",
};
