"use client";

import { FileText, ImageIcon, Paperclip, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ActionResult } from "@/types";

import { ACCEPT_ANEXO, MAX_POR_REGISTRO, formatarTamanho } from "./anexos";
import type { AnexoPosVendaDTO } from "./tipos";

/**
 * Anexos de um registro da timeline do Pós-venda (Sprint 4.6).
 *
 * Vive no CARD do registro, não no diálogo de criar/editar. O diálogo grava
 * registro e custos numa transação única, mas um anexo precisa de um
 * `registroId` que ainda não existe durante a criação. Anexar pelo card elimina
 * área de staging, elimina arquivo órfão por diálogo abandonado, e faz registro
 * novo e existente terem exatamente a mesma regra (ADR-0414).
 *
 * O upload vai por `fetch` para o Route Handler — Server Action não serve, pelo
 * limite de 1 MB de corpo. A exclusão, sim, é Server Action: só apaga uma linha.
 *
 * `baseUrl` e `onExcluir` chegam por prop porque Troca e OS têm rotas e actions
 * próprias. O componente não conhece nenhum dos dois domínios — é o que permite
 * usá-lo nos dois sem um `if` de submódulo aqui dentro.
 */
export function AnexosEditorPosVenda({
  baseUrl,
  anexos,
  readOnly,
  onExcluir,
}: {
  /** Rota dos anexos DESTE registro, sem barra no fim. */
  baseUrl: string;
  anexos: AnexoPosVendaDTO[];
  readOnly: boolean;
  onExcluir: (anexoId: string) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [aExcluir, setAExcluir] = useState<AnexoPosVendaDTO | null>(null);

  const noLimite = anexos.length >= MAX_POR_REGISTRO;

  async function enviar(file: File) {
    setEnviando(true);
    const corpo = new FormData();
    corpo.append("file", file);

    try {
      const resp = await fetch(baseUrl, { method: "POST", body: corpo });
      if (resp.ok) {
        toast.success("Anexo adicionado.");
        router.refresh();
      } else {
        const { erro } = (await resp.json().catch(() => ({}))) as {
          erro?: string;
        };
        toast.error(erro ?? "Falha ao anexar o arquivo.");
      }
    } catch {
      toast.error("Falha de rede ao enviar o arquivo.");
    }

    setEnviando(false);
    // Limpa o input: sem isso, reenviar o MESMO arquivo não dispara `change`.
    if (inputRef.current) inputRef.current.value = "";
  }

  async function confirmarExclusao() {
    if (!aExcluir) return;
    const result = await onExcluir(aExcluir.id);
    if (result.success) {
      toast.success("Anexo excluído.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setAExcluir(null);
  }

  if (readOnly && anexos.length === 0) return null;

  return (
    <>
      <Separator />
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Paperclip className="h-4 w-4" />
            Anexos{anexos.length > 0 ? ` (${anexos.length})` : ""}
          </p>

          {!readOnly && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT_ANEXO}
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void enviar(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={enviando || noLimite}
                onClick={() => inputRef.current?.click()}
                title={
                  noLimite
                    ? `Máximo de ${MAX_POR_REGISTRO} anexos por registro.`
                    : "JPG, PNG, WebP, PDF, Word e Excel. Máx. 10 MB por arquivo."
                }
              >
                <Upload className="h-4 w-4" />
                {enviando ? "Enviando…" : "Adicionar anexo"}
              </Button>
            </>
          )}
        </div>

        {anexos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum anexo.</p>
        ) : (
          <ul className="space-y-1">
            {anexos.map((anexo) => {
              const ehImagem = anexo.mimeType.startsWith("image/");
              const Icone = ehImagem ? ImageIcon : FileText;
              return (
                <li
                  key={anexo.id}
                  data-testid="anexo-item"
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <a
                    href={`${baseUrl}/${anexo.id}`}
                    // O nome já vai no Content-Disposition da rota; `download`
                    // aqui só reforça a intenção para o navegador.
                    download={anexo.nomeOriginal}
                    className="flex min-w-0 items-center gap-1.5 rounded-sm text-primary underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <Icone className="h-4 w-4 shrink-0" />
                    <span className="truncate">{anexo.nomeOriginal}</span>
                  </a>
                  <span className="flex shrink-0 items-center gap-1 text-muted-foreground tabular-nums">
                    {formatarTamanho(anexo.tamanho)}
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Excluir anexo ${anexo.nomeOriginal}`}
                        className="text-destructive hover:text-destructive"
                        onClick={() => setAExcluir(anexo)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={aExcluir !== null}
        onOpenChange={(open) => {
          if (!open) setAExcluir(null);
        }}
        title="Excluir anexo"
        description={
          aExcluir
            ? `O arquivo "${aExcluir.nomeOriginal}" será removido do registro.`
            : ""
        }
        onConfirm={confirmarExclusao}
      />
    </>
  );
}
