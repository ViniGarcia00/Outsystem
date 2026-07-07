import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppPage, PageHeader } from "@/components/app";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getDiagnostics } from "@/services/diagnostics.service";

import { RefreshButton } from "./refresh-button";

export const metadata: Metadata = { title: "Diagnóstico (dev)" };

// Sempre executa em tempo de requisição (mede o estado atual).
export const dynamic = "force-dynamic";

export default async function DiagnosticsPage() {
  // Página exclusiva de desenvolvimento — não existe em produção.
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const diag = await getDiagnostics();
  const ok = diag.prismaStatus === "ok";

  const items: { label: string; value: string }[] = [
    { label: "Ambiente", value: diag.environment },
    { label: "Status do Prisma", value: ok ? "conectado" : "erro" },
    {
      label: "Tempo de conexão (1ª consulta)",
      value: diag.connectionMs != null ? `${diag.connectionMs} ms` : "—",
    },
    {
      label: "Tempo de consulta simples",
      value: diag.queryMs != null ? `${diag.queryMs} ms` : "—",
    },
    { label: "Versão do PostgreSQL", value: diag.postgresVersion ?? "—" },
    {
      label: "Tempo de resposta da aplicação",
      value: `${diag.totalMs} ms`,
    },
  ];

  return (
    <AppPage>
      <PageHeader
        title="Diagnóstico"
        description="Ferramenta de desenvolvimento — infraestrutura e banco de dados."
        actions={<RefreshButton />}
      />

      <Card>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status geral</span>
            <Badge variant={ok ? "secondary" : "destructive"}>
              {ok ? "Saudável" : "Falha"}
            </Badge>
          </div>

          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {items.map((item) => (
              <div key={item.label} className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                <dd className="text-sm font-medium break-words">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          {diag.error && (
            <p className="text-sm break-words text-destructive">
              {diag.error}
            </p>
          )}
        </CardContent>
      </Card>
    </AppPage>
  );
}
