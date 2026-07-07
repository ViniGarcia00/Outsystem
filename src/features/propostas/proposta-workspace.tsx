"use client";

import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AppPage, PageHeader } from "@/components/app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { WorkspaceDTO } from "@/services/proposta-conteudo.service";
import { formatDate } from "@/utils";

import { adicionarSecaoAction } from "./conteudo-actions";
import { MODELO_LABEL, STATUS_BADGE_VARIANT, STATUS_LABEL } from "./labels";
import { SecaoCard } from "./secao-card";

interface Option {
  value: string;
  label: string;
}

export function PropostaWorkspace({
  data,
  produtos,
}: {
  data: WorkspaceDTO;
  produtos: Option[];
}) {
  const router = useRouter();
  const [novaSecao, setNovaSecao] = useState("");
  const readOnly = data.readOnly;

  const refresh = () => router.refresh();

  const adicionarSecao = async () => {
    const nome = novaSecao.trim();
    if (!nome) return;
    const result = await adicionarSecaoAction(data.id, nome);
    if (result.success) {
      setNovaSecao("");
      refresh();
    } else {
      toast.error(result.error);
    }
  };

  const resumo: { label: string; value: string }[] = [
    { label: "Cliente", value: data.clienteNome },
    { label: "Vendedor", value: data.vendedorNome ?? "—" },
    { label: "Modelo", value: MODELO_LABEL[data.modelo] },
    { label: "Validade", value: `${data.validadeDias} dia(s)` },
    {
      label: "Emitida em",
      value: data.emitidaAt ? formatDate(data.emitidaAt) : "—",
    },
  ];

  return (
    <AppPage>
      <PageHeader
        title={`Proposta ${data.proposalNumber} · Rev.${data.revisaoAtual ?? 0}`}
        description="Workspace da proposta — cabeçalho e conteúdo da revisão atual."
        actions={
          <>
            <Badge variant={STATUS_BADGE_VARIANT[data.status]}>
              {STATUS_LABEL[data.status]}
            </Badge>
            <Button
              variant="outline"
              onClick={() => router.push(`/propostas/${data.id}/editar`)}
            >
              <Pencil className="h-4 w-4" />
              {readOnly ? "Ver dados da proposta" : "Editar dados da proposta"}
            </Button>
          </>
        }
      />

      {/* Cabeçalho resumido */}
      <Card>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
            {resumo.map((r) => (
              <div key={r.label} className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">{r.label}</dt>
                <dd className="text-sm font-medium break-words">{r.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {/* Conteúdo da revisão atual */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Conteúdo — Rev.{data.revisaoAtual ?? 0}
        </h2>

        {data.secoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma seção nesta revisão.
            {!readOnly && " Adicione a primeira seção abaixo."}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {data.secoes.map((secao, index) => (
              <SecaoCard
                key={secao.id}
                secao={secao}
                produtos={produtos}
                readOnly={readOnly}
                isFirst={index === 0}
                isLast={index === data.secoes.length - 1}
                refresh={refresh}
              />
            ))}
          </div>
        )}

        {!readOnly && (
          <div className="flex items-center gap-2">
            <Input
              value={novaSecao}
              onChange={(e) => setNovaSecao(e.target.value)}
              placeholder="Nome da nova seção (ex.: Sala)"
              className="max-w-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  adicionarSecao();
                }
              }}
            />
            <Button variant="outline" onClick={adicionarSecao}>
              <Plus className="h-4 w-4" />
              Adicionar seção
            </Button>
          </div>
        )}
      </section>
    </AppPage>
  );
}
