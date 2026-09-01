/**
 * Rótulos, cores e ordens do Pós-venda (Sprint 4.6) — FONTE ÚNICA. A UI nunca
 * escreve o texto de um status à mão.
 *
 * Os tipos espelham os enums do Prisma. Acrescentar um valor lá quebra este
 * arquivo no typecheck, que é o comportamento desejado — e é a mesma divergência
 * consciente registrada em `features/instalacoes/labels.ts`: o tipo mora aqui e
 * o service o importa, porque este é o único lugar em que o conjunto precisa
 * estar completo (rótulo + cor + ordem).
 *
 * Módulo PURO — sem banco, sem React.
 */

// ---------------------------------------------------------------------------
// Troca Antecipada
// ---------------------------------------------------------------------------

export type StatusTroca =
  | "ABERTA"
  | "ENVIO_PENDENTE"
  | "DEVOLUCAO_PENDENTE"
  | "EM_ANALISE"
  | "VALOR_PENDENTE"
  | "FINALIZADA"
  | "CANCELADA";

export const STATUS_TROCA_LABEL: Record<StatusTroca, string> = {
  ABERTA: "Aberta",
  ENVIO_PENDENTE: "Envio pendente",
  DEVOLUCAO_PENDENTE: "Devolução pendente",
  EM_ANALISE: "Em análise",
  VALOR_PENDENTE: "Valor pendente",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
};

/**
 * Ordem de exibição no filtro — do início ao fim do ciclo operacional.
 *
 * NÃO é uma máquina de estados: qualquer transição é permitida (spec §11), como
 * nas Instalações. Esta lista só decide a ordem do `Select`.
 */
export const STATUS_TROCA_ORDER: StatusTroca[] = [
  "ABERTA",
  "ENVIO_PENDENTE",
  "DEVOLUCAO_PENDENTE",
  "EM_ANALISE",
  "VALOR_PENDENTE",
  "FINALIZADA",
  "CANCELADA",
];

/** Padrão de cor do projeto (ADR-0159): verde = ok, vermelho = fim. */
export const STATUS_TROCA_BADGE: Record<
  StatusTroca,
  "secondary" | "info" | "warning" | "success" | "danger"
> = {
  ABERTA: "secondary",
  ENVIO_PENDENTE: "warning",
  DEVOLUCAO_PENDENTE: "warning",
  EM_ANALISE: "info",
  VALOR_PENDENTE: "warning",
  FINALIZADA: "success",
  CANCELADA: "danger",
};

export type DestinatarioTroca = "CLIENTE" | "INSTALADOR" | "OUTRO";

export const DESTINATARIO_LABEL: Record<DestinatarioTroca, string> = {
  CLIENTE: "Cliente",
  INSTALADOR: "Instalador",
  OUTRO: "Outro",
};

export const DESTINATARIO_ORDER: DestinatarioTroca[] = [
  "CLIENTE",
  "INSTALADOR",
  "OUTRO",
];

/**
 * `true` quando o tipo de destinatário exige `destinatarioNome`.
 *
 * `CLIENTE` usa o próprio Cliente da Troca como referência visual e dispensa o
 * campo; os outros dois não têm de onde tirar o nome — e NÃO há cadastro de
 * parceiro/instalador nesta Sprint, de propósito.
 */
export function exigeDestinatarioNome(tipo: DestinatarioTroca): boolean {
  return tipo !== "CLIENTE";
}

// ---------------------------------------------------------------------------
// Ordem de Serviço de Pós-venda
// ---------------------------------------------------------------------------

export type StatusOS =
  | "ABERTA"
  | "AGUARDANDO_ANALISE"
  | "EM_ANALISE"
  | "EM_MANUTENCAO"
  | "AGUARDANDO_PECA"
  | "FINALIZADA"
  | "CANCELADA";

export const STATUS_OS_LABEL: Record<StatusOS, string> = {
  ABERTA: "Aberta",
  AGUARDANDO_ANALISE: "Aguardando análise",
  EM_ANALISE: "Em análise",
  EM_MANUTENCAO: "Em manutenção",
  AGUARDANDO_PECA: "Aguardando peça",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
};

export const STATUS_OS_ORDER: StatusOS[] = [
  "ABERTA",
  "AGUARDANDO_ANALISE",
  "EM_ANALISE",
  "EM_MANUTENCAO",
  "AGUARDANDO_PECA",
  "FINALIZADA",
  "CANCELADA",
];

export const STATUS_OS_BADGE: Record<
  StatusOS,
  "secondary" | "info" | "warning" | "success" | "danger"
> = {
  ABERTA: "secondary",
  AGUARDANDO_ANALISE: "warning",
  EM_ANALISE: "info",
  EM_MANUTENCAO: "info",
  AGUARDANDO_PECA: "warning",
  FINALIZADA: "success",
  CANCELADA: "danger",
};

/**
 * Origem da OS. **Não existe coluna no banco** (ADR-0419): é DERIVADA de
 * `trocaAntecipadaId`. Este tipo só existe para a apresentação.
 */
export type OrigemOS = "DIRETA" | "TROCA_ANTECIPADA";

export const ORIGEM_OS_LABEL: Record<OrigemOS, string> = {
  DIRETA: "Direta",
  TROCA_ANTECIPADA: "Troca antecipada",
};

/**
 * A única forma de decidir a origem. Existe como função — e não como expressão
 * solta espalhada por componente — para que a derivação seja uma coisa só.
 */
export function origemDe(trocaAntecipadaId: string | null): OrigemOS {
  return trocaAntecipadaId ? "TROCA_ANTECIPADA" : "DIRETA";
}

/** Rótulo da origem para a listagem: "Direta" ou "Troca 1001". */
export function rotuloOrigem(trocaNumero: number | null): string {
  return trocaNumero === null
    ? ORIGEM_OS_LABEL.DIRETA
    : `Troca ${trocaNumero}`;
}

// ---------------------------------------------------------------------------
// Custos (compartilhados pelos dois submódulos)
// ---------------------------------------------------------------------------

export type CategoriaCustoPosVenda =
  | "MOTOBOY"
  | "SEDEX"
  | "FRETE"
  | "VISITA"
  | "PECA"
  | "MATERIAL"
  | "TERCEIRIZACAO"
  | "OUTROS";

export const CATEGORIA_CUSTO_LABEL: Record<CategoriaCustoPosVenda, string> = {
  MOTOBOY: "Motoboy",
  SEDEX: "Sedex",
  FRETE: "Frete",
  VISITA: "Visita",
  PECA: "Peça",
  MATERIAL: "Material",
  TERCEIRIZACAO: "Terceirização",
  OUTROS: "Outro",
};

/**
 * Ordem canônica — usada só para exibir totais por categoria numa ordem
 * estável. Não é o que o `Select` oferece.
 */
export const CATEGORIAS_CUSTO: CategoriaCustoPosVenda[] = [
  "MOTOBOY",
  "SEDEX",
  "FRETE",
  "VISITA",
  "PECA",
  "MATERIAL",
  "TERCEIRIZACAO",
  "OUTROS",
];

/**
 * O que a TROCA oferece: custos de ENVIO. É o que a operação lança enquanto o
 * substituto vai e o defeituoso volta (spec §14).
 */
export const CATEGORIAS_CUSTO_TROCA: CategoriaCustoPosVenda[] = [
  "MOTOBOY",
  "SEDEX",
  "FRETE",
  "VISITA",
  "OUTROS",
];

/**
 * O que a OS oferece: custos de REPARO (spec §36).
 *
 * A enum do banco é uma só; a separação é da interface. Duas enums obrigariam a
 * duplicar o módulo de cálculo e a tabela de rótulos para ganhar uma garantia
 * que o `Select` já dá (ADR-0418).
 */
export const CATEGORIAS_CUSTO_OS: CategoriaCustoPosVenda[] = [
  "PECA",
  "FRETE",
  "TERCEIRIZACAO",
  "MATERIAL",
  "OUTROS",
];
