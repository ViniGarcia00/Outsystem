import { CalendarClock } from "lucide-react";
import Link from "next/link";

import { PageContent, PageEmpty } from "@/components/app";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  STATUS_BADGE_VARIANT,
  STATUS_LABEL as STATUS_INSTALACAO_LABEL,
} from "@/features/instalacoes/labels";
import { formatDate } from "@/utils";

import {
  STATUS_INSTALACAO_DASHBOARD,
  type DashboardDTO,
} from "./dashboard";

/**
 * Dashboard V1 (Sprint 4.0.3, ADR-0405) — apresentação apenas.
 *
 * Recebe o DTO pronto do service e só renderiza: nenhuma contagem, soma,
 * ordenação ou corte acontece aqui, e **nenhum dado é fictício**. Os rótulos de
 * status vêm de `labels.ts`; a tela não escreve o texto de um status à mão.
 *
 * Sem gráficos, comparativos, metas ou filtros — a V1 responde "o que está
 * acontecendo agora", não substitui um BI.
 */

function Indicador({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <Card size="sm">
      <CardContent className="space-y-1">
        <p className="text-sm text-muted-foreground">{rotulo}</p>
        <p className="text-2xl font-semibold tabular-nums">{valor}</p>
      </CardContent>
    </Card>
  );
}

function Grupo({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
      {children}
    </section>
  );
}

export function DashboardView({ dados }: { dados: DashboardDTO }) {
  return (
    <div className="space-y-8">
      <Grupo titulo="Comercial">
        {/* Três indicadores, na ordem do ciclo comercial: Rascunho → Emitida →
            Aprovada (Sprint 4.3). Eram dois desde a remoção do grupo de Custos
            na 4.2. Custos NÃO volta aqui. */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Indicador
            rotulo="Propostas em Rascunho"
            valor={String(dados.propostas.rascunho)}
          />
          <Indicador
            rotulo="Propostas Emitidas"
            valor={String(dados.propostas.emitidas)}
          />
          <Indicador
            rotulo="Propostas Aprovadas"
            valor={String(dados.propostas.aprovadas)}
          />
        </div>
      </Grupo>

      <Grupo titulo="Instalações">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STATUS_INSTALACAO_DASHBOARD.map((status) => (
            <Indicador
              key={status}
              rotulo={STATUS_INSTALACAO_LABEL[status]}
              valor={String(dados.instalacoes[status])}
            />
          ))}
        </div>
      </Grupo>

      <Grupo titulo="Próximas Instalações">
        {dados.proximas.length === 0 ? (
          <PageEmpty
            icon={CalendarClock}
            title="Nenhuma instalação agendada"
            description="Instalações com data agendada a partir de hoje aparecem aqui."
          />
        ) : (
          <PageContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-4 py-2 font-medium">Instalação</th>
                    <th className="px-4 py-2 font-medium">Cliente</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.proximas.map((i) => (
                    <tr key={i.id} className="border-b last:border-0">
                      <td className="px-4 py-2 whitespace-nowrap tabular-nums">
                        {formatDate(i.dataAgendada)}
                      </td>
                      <td className="px-4 py-2">
                        {/* Mesmo padrão da listagem: <a> real, navegável por
                            teclado e com Ctrl/Cmd+clique (ADR-0404). */}
                        <Link
                          href={`/instalacoes/${i.id}`}
                          aria-label={`Abrir instalação ${i.numero}`}
                          className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          {i.numero}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{i.clienteNome}</td>
                      <td className="px-4 py-2">
                        <Badge variant={STATUS_BADGE_VARIANT[i.status]}>
                          {STATUS_INSTALACAO_LABEL[i.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">{i.responsavelNome || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PageContent>
        )}
      </Grupo>
    </div>
  );
}
