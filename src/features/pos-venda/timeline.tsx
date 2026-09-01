"use client";

import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { PageEmpty } from "@/components/app";
import { ConfirmDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { dataHoraParaExibicao } from "@/features/instalacoes/datas";
import type { UsuarioOption } from "@/services/usuario.service";
import type { ActionResult } from "@/types";
import { formatCurrency } from "@/utils";

import { AnexosEditorPosVenda } from "./anexos-editor";
import { totalDoRegistro } from "./custos";
import { CATEGORIA_CUSTO_LABEL, type CategoriaCustoPosVenda } from "./labels";
import { RegistroPosVendaDialog } from "./registro-dialog";
import type { RegistroPosVendaValues } from "./registro-schema";
import type { RegistroPosVendaDTO } from "./tipos";

/**
 * Timeline do Pós-venda — o MESMO componente para Troca e OS (Sprint 4.6).
 *
 * Os registros chegam JÁ ORDENADOS do service (dataHora desc, createdAt desc,
 * id desc). **Não reordenar aqui**: a ordem é regra, e regra fica no service.
 *
 * As quatro operações chegam por prop. É o que permite um componente só sem
 * nenhum `if` de submódulo: o componente sabe orquestrar diálogo, confirmação e
 * refresh; quem sabe *qual* Server Action chamar é o workspace.
 *
 * Todos os botões são `type="button"`: os cards vivem dentro do `<form>` do
 * workspace, e um `type` ausente submeteria o cabeçalho.
 */
export function TimelinePosVenda({
  registros,
  readOnly,
  responsaveis,
  categorias,
  baseUrlAnexos,
  onCriar,
  onAtualizar,
  onExcluir,
  onExcluirAnexo,
}: {
  registros: RegistroPosVendaDTO[];
  readOnly: boolean;
  responsaveis: UsuarioOption[];
  categorias: CategoriaCustoPosVenda[];
  /** Monta a rota de anexos de um registro deste agregado. */
  baseUrlAnexos: (registroId: string) => string;
  onCriar: (values: RegistroPosVendaValues) => Promise<ActionResult<unknown>>;
  onAtualizar: (
    registroId: string,
    values: RegistroPosVendaValues,
  ) => Promise<ActionResult>;
  onExcluir: (registroId: string) => Promise<ActionResult>;
  onExcluirAnexo: (
    registroId: string,
    anexoId: string,
  ) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [emEdicao, setEmEdicao] = useState<RegistroPosVendaDTO | null>(null);
  const [aExcluir, setAExcluir] = useState<RegistroPosVendaDTO | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const abrirNovo = () => {
    setEmEdicao(null);
    setDialogOpen(true);
  };

  async function confirmar(values: RegistroPosVendaValues) {
    setSubmitting(true);
    const result = emEdicao
      ? await onAtualizar(emEdicao.id, values)
      : await onCriar(values);

    if (result.success) {
      toast.success(emEdicao ? "Registro atualizado." : "Registro adicionado.");
      setDialogOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setSubmitting(false);
  }

  async function confirmarExclusao() {
    if (!aExcluir) return;
    setSubmitting(true);
    const result = await onExcluir(aExcluir.id);

    if (result.success) {
      toast.success("Registro excluído.");
      router.refresh();
    } else {
      // Aqui chega a mensagem do bloqueio quando o registro tem custos.
      toast.error(result.error);
    }
    setAExcluir(null);
    setSubmitting(false);
  }

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex justify-end">
          <Button type="button" onClick={abrirNovo}>
            <Plus className="h-4 w-4" />
            Novo registro
          </Button>
        </div>
      )}

      {registros.length === 0 ? (
        <PageEmpty
          icon={ClipboardList}
          title="Nenhum acontecimento registrado ainda"
          description="Registre o relato do cliente, o envio, a devolução e o que for sendo decidido."
        />
      ) : (
        <div className="space-y-3">
          {registros.map((registro) => (
            <RegistroPosVendaCard
              key={registro.id}
              registro={registro}
              readOnly={readOnly}
              baseUrlAnexos={baseUrlAnexos(registro.id)}
              onEditar={() => {
                setEmEdicao(registro);
                setDialogOpen(true);
              }}
              onExcluir={() => setAExcluir(registro)}
              onExcluirAnexo={(anexoId) =>
                onExcluirAnexo(registro.id, anexoId)
              }
            />
          ))}
        </div>
      )}

      <RegistroPosVendaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        registro={emEdicao}
        submitting={submitting}
        onConfirm={confirmar}
        responsaveis={responsaveis}
        categorias={categorias}
      />

      <ConfirmDialog
        open={aExcluir !== null}
        onOpenChange={(open) => {
          if (!open) setAExcluir(null);
        }}
        title="Excluir registro"
        description="O acontecimento será removido da timeline. Registros com custos lançados não podem ser excluídos."
        onConfirm={confirmarExclusao}
      />
    </div>
  );
}

/**
 * Um acontecimento da timeline.
 *
 * A data-hora usa `dataHoraParaExibicao` (fuso fixo `America/Sao_Paulo`),
 * NUNCA o `formatDateTime` de `@/utils`, que usa o fuso do runtime.
 *
 * O responsável exibido é `responsavelNome`, o SNAPSHOT — não o nome atual do
 * usuário. Renomear o cadastro não reescreve um fato já registrado (ADR-0408).
 */
function RegistroPosVendaCard({
  registro,
  readOnly,
  baseUrlAnexos,
  onEditar,
  onExcluir,
  onExcluirAnexo,
}: {
  registro: RegistroPosVendaDTO;
  readOnly: boolean;
  baseUrlAnexos: string;
  onEditar: () => void;
  onExcluir: () => void;
  onExcluirAnexo: (anexoId: string) => Promise<ActionResult>;
}) {
  const total = totalDoRegistro(registro.custos);

  return (
    <Card data-testid="registro-card">
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <span className="text-sm font-medium tabular-nums">
              {dataHoraParaExibicao(registro.dataHora)}
            </span>
            <p className="text-sm text-muted-foreground">
              Responsável: {registro.responsavelNome}
            </p>
          </div>

          {!readOnly && (
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={onEditar}>
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={onExcluir}
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            </div>
          )}
        </div>

        <p className="whitespace-pre-wrap break-words text-sm">
          {registro.relato}
        </p>

        {registro.custos.length > 0 && (
          <>
            <Separator />
            <dl className="space-y-1 text-sm">
              {registro.custos.map((custo) => (
                <div key={custo.id} className="flex justify-between gap-4">
                  <dt className="min-w-0 break-words text-muted-foreground">
                    {CATEGORIA_CUSTO_LABEL[custo.categoria]}
                    {custo.descricao ? ` — ${custo.descricao}` : ""}
                  </dt>
                  <dd className="shrink-0 tabular-nums">
                    {formatCurrency(custo.valor)}
                  </dd>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between gap-4 font-medium">
                <dt>Total do registro</dt>
                <dd className="shrink-0 tabular-nums">
                  {formatCurrency(total)}
                </dd>
              </div>
            </dl>
          </>
        )}

        {/* Anexos ficam AQUI, não no diálogo: o anexo precisa de um registroId
            que só existe depois de o registro ser gravado (ADR-0414). */}
        <AnexosEditorPosVenda
          baseUrl={baseUrlAnexos}
          anexos={registro.anexos}
          readOnly={readOnly}
          onExcluir={onExcluirAnexo}
        />
      </CardContent>
    </Card>
  );
}
