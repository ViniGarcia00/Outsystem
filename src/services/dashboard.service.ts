import {
  montarDashboard,
  type DashboardDTO,
  type ProximaInstalacao,
} from "@/features/dashboard/dashboard";
// Importar módulos PUROS de features é o padrão vigente — `proposta.service.ts`
// faz o mesmo com `features/propostas/totais`, e `instalacao.service.ts` com
// `features/instalacoes/endereco`.
import type { StatusInstalacao } from "@/features/instalacoes/labels";
import { prisma } from "@/infrastructure/database";
import type { StatusProposta } from "@/services/proposta.service";
import { inicioDoDiaBrasil } from "@/utils";

/**
 * Dashboard V1 — camada de LEITURA (Sprint 4.0.3, ADR-0405).
 *
 * Só IO. A regra (quais status contam, o que é "próxima", ordem e corte) mora em
 * `features/dashboard/dashboard.ts`, módulo puro testado sem banco — mesmo par
 * service/mapper de `proposta-pdf`.
 *
 * Três consultas em paralelo, nenhuma redundante. Nada é agregado no cliente:
 * as contagens saem de `groupBy`, no banco.
 *
 * A soma dos custos extras saiu na Sprint 4.2 (ADR-0410): o card deixou de
 * existir no painel, e manter o `aggregate` seria consulta sem leitor. O custo
 * por instalação continua intacto em `features/instalacoes/custos.ts`.
 *
 * Não conhece o PDF Geral de Produtos — os dois são independentes por decisão.
 */

export type { DashboardDTO, ProximaInstalacao };

/** Nome de exibição do cliente — PJ mostra a razão social. */
const nomeCliente = (c: {
  tipoPessoa: string;
  nome: string | null;
  empresa: string | null;
}): string =>
  (c.tipoPessoa === "PJ" ? c.empresa || c.nome : c.nome || c.empresa) || "—";

export async function getDashboard(): Promise<DashboardDTO> {
  const inicioDeHoje = inicioDoDiaBrasil();

  const [propostas, instalacoes, candidatas] = await Promise.all([
    prisma.proposta.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.instalacao.groupBy({ by: ["status"], _count: { _all: true } }),
    // Pré-filtro SQL deliberadamente mais AMPLO que a regra: remove só o que a
    // regra pura também removeria (sem data agendada, já encerrada). O corte por
    // data e o limite de 5 ficam no módulo puro, que é onde estão testados —
    // duplicar a regra aqui criaria duas fontes para a mesma decisão.
    prisma.instalacao.findMany({
      where: {
        dataAgendada: { not: null },
        status: { notIn: ["CONCLUIDA", "CANCELADA"] },
      },
      select: {
        id: true,
        numero: true,
        dataAgendada: true,
        status: true,
        tecnicoResponsavel: { select: { nome: true } },
        cliente: { select: { tipoPessoa: true, nome: true, empresa: true } },
      },
      orderBy: { dataAgendada: "asc" },
    }),
  ]);

  return montarDashboard({
    propostasPorStatus: propostas.map((p) => ({
      status: p.status as StatusProposta,
      total: p._count._all,
    })),
    instalacoesPorStatus: instalacoes.map((i) => ({
      status: i.status as StatusInstalacao,
      total: i._count._all,
    })),
    candidatasProximas: candidatas.map((i) => ({
      id: i.id,
      numero: i.numero,
      clienteNome: nomeCliente(i.cliente),
      // O `where` garante que não é nulo; o tipo do Prisma não sabe disso.
      dataAgendada: i.dataAgendada as Date,
      status: i.status as StatusInstalacao,
      responsavelNome: i.tecnicoResponsavel?.nome ?? null,
    })),
    inicioDeHoje,
  });
}
