import { ClipboardList, RefreshCcw } from "lucide-react";
import Link from "next/link";

import { AppPage, PageHeader } from "@/components/app";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Hub do Pós-venda (spec §2).
 *
 * **Só as duas opções que existem.** Nada de cartão desabilitado, "em breve" ou
 * placeholder de funcionalidade futura: um hub que anuncia o que não existe
 * transfere para o usuário o trabalho de descobrir o que é real.
 *
 * Server Component — é uma página estática de navegação, sem estado e sem
 * interação além dos dois links.
 */

const OPCOES = [
  {
    href: "/pos-venda/trocas-antecipadas",
    titulo: "Trocas Antecipadas",
    descricao:
      "Envio do substituto antes do retorno do produto com defeito. Controla o que foi enviado, o que se espera de volta e o que ainda está pendente.",
    icone: RefreshCcw,
  },
  {
    href: "/pos-venda/ordens-de-servico",
    titulo: "Ordens de Serviço",
    descricao:
      "Análise, manutenção e reparo dos produtos. Registra o defeito encontrado e o serviço executado.",
    icone: ClipboardList,
  },
] as const;

export function PosVendaHub() {
  return (
    <AppPage>
      <PageHeader
        title="Pós-venda"
        description="Controle operacional de produtos já instalados ou vendidos."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {OPCOES.map(({ href, titulo, descricao, icone: Icone }) => (
          <Link
            key={href}
            href={href}
            className="rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Card className="h-full transition-colors hover:border-primary/40 hover:bg-muted/40">
              <CardContent className="flex flex-col gap-2">
                <Icone className="h-6 w-6 text-primary" />
                <h2 className="text-base font-semibold tracking-tight">
                  {titulo}
                </h2>
                <p className="text-sm text-muted-foreground">{descricao}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AppPage>
  );
}
