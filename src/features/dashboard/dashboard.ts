import type { StatusInstalacao } from "@/features/instalacoes/labels";
import type { StatusProposta } from "@/services/proposta.service";

/**
 * Dashboard V1 — REGRA PURA (Sprint 4.0.3, ADR-0405).
 *
 * O service faz o IO; aqui mora a decisão: quais status contam, quais
 * instalações são "próximas", em que ordem e quantas. Assim a regra é testável
 * sem banco — que é o único jeito de provar ordenação e estado vazio.
 *
 * **Sobre a dependência de `features/instalacoes/labels`:** só o *tipo* dos
 * status. Diferente do fuso horário — preocupação transversal, que por isso foi
 * para `utils/data-brasil.ts` —, o conjunto de status de uma Instalação é
 * vocabulário exclusivo daquele domínio. Um painel que informa instalações
 * precisa conhecê-lo; redeclarar os status aqui faria um valor novo passar
 * despercebido pelo typecheck, exatamente o que `labels.ts` alerta.
 *
 * Não conhece o PDF Geral de Produtos, nem o contrário — os dois são
 * independentes por decisão.
 *
 * Módulo PURO — sem Prisma, sem IO, sem React.
 */

/** Quantas instalações a seção "Próximas Instalações" mostra. */
export const MAX_PROXIMAS = 5;

/** Status de instalação exibidos como card, na ordem do ciclo operacional. */
export const STATUS_INSTALACAO_DASHBOARD = [
  "A_AGENDAR",
  "AGENDADA",
  "AGUARDANDO_MATERIAL",
  "EM_ANDAMENTO",
  "CONCLUIDA",
] as const;

export type StatusInstalacaoDashboard =
  (typeof STATUS_INSTALACAO_DASHBOARD)[number];

/** Status que encerram a instalação — nunca entram em "próximas". */
const STATUS_ENCERRADOS: StatusInstalacao[] = ["CONCLUIDA", "CANCELADA"];

export interface ProximaInstalacao {
  id: string;
  numero: number;
  clienteNome: string;
  /** Sempre presente: instalação sem data agendada não é "próxima". */
  dataAgendada: Date;
  status: StatusInstalacao;
  responsavelAtual: string | null;
}

export interface DashboardDTO {
  propostas: { rascunho: number; emitidas: number };
  instalacoes: Record<StatusInstalacaoDashboard, number>;
  /** Soma dos custos extras de todas as instalações. */
  custosAcumulados: number;
  proximas: ProximaInstalacao[];
}

export interface FonteDashboard {
  propostasPorStatus: { status: StatusProposta; total: number }[];
  instalacoesPorStatus: { status: StatusInstalacao; total: number }[];
  custosAcumulados: number;
  /**
   * Instalações com data agendada, ainda em curso. O service pode pré-filtrar no
   * SQL, desde que só remova o que a regra abaixo também removeria — o corte
   * final é sempre daqui.
   */
  candidatasProximas: ProximaInstalacao[];
  /** Início do dia no fuso brasileiro (`inicioDoDiaBrasil`). */
  inicioDeHoje: Date;
}

function contar<T extends string>(
  linhas: { status: string; total: number }[],
  status: T,
): number {
  return linhas.find((l) => l.status === status)?.total ?? 0;
}

/**
 * Instalações futuras/agendadas, mais próximas primeiro.
 *
 * "Futura" é a partir do **início do dia de hoje no Brasil**, não do instante
 * atual: uma instalação agendada para hoje de manhã continua sendo a próxima às
 * 15h. Encerradas (Concluída, Cancelada) nunca entram.
 *
 * Desempate por `numero` para que a ordem seja determinística quando duas
 * instalações caem no mesmo dia — sem isso a listagem oscilaria entre execuções.
 */
export function selecionarProximas(
  candidatas: ProximaInstalacao[],
  inicioDeHoje: Date,
): ProximaInstalacao[] {
  return candidatas
    .filter(
      (i) =>
        !STATUS_ENCERRADOS.includes(i.status) &&
        i.dataAgendada.getTime() >= inicioDeHoje.getTime(),
    )
    .sort(
      (a, b) =>
        a.dataAgendada.getTime() - b.dataAgendada.getTime() ||
        a.numero - b.numero,
    )
    .slice(0, MAX_PROXIMAS);
}

export function montarDashboard(fonte: FonteDashboard): DashboardDTO {
  const instalacoes = Object.fromEntries(
    STATUS_INSTALACAO_DASHBOARD.map((s) => [
      s,
      contar(fonte.instalacoesPorStatus, s),
    ]),
  ) as Record<StatusInstalacaoDashboard, number>;

  return {
    propostas: {
      rascunho: contar(fonte.propostasPorStatus, "RASCUNHO"),
      emitidas: contar(fonte.propostasPorStatus, "EMITIDA"),
    },
    instalacoes,
    // Duas casas: a soma agrega N linhas independentes e o erro de ponto
    // flutuante acumula — mesmo endurecimento de `features/instalacoes/custos.ts`.
    custosAcumulados: Math.round(fonte.custosAcumulados * 100) / 100,
    proximas: selecionarProximas(fonte.candidatasProximas, fonte.inicioDeHoje),
  };
}
