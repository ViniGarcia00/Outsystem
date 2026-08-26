"use client";

import { ClipboardList, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { PageEmpty } from "@/components/app";
import { ConfirmDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { RegistroDTO } from "@/services/instalacao-registro.service";
import type { UsuarioOption } from "@/services/usuario.service";

import { RegistroCard } from "./registro-card";
import {
  atualizarRegistroAction,
  criarRegistroAction,
  excluirRegistroAction,
} from "./registro-actions";
import { RegistroDialog } from "./registro-dialog";
import type { RegistroValues } from "./registro-schema";

/**
 * Timeline da instalação (Sprint 4.0.2).
 *
 * Os registros chegam JÁ ORDENADOS do service (aconteceuEm desc, createdAt
 * desc, id desc). Não reordenar aqui: a ordem é regra, e regra fica no service.
 */
export function Cronologia({
  instalacaoId,
  registros,
  readOnly,
  tecnicos,
}: {
  instalacaoId: string;
  registros: RegistroDTO[];
  readOnly: boolean;
  tecnicos: UsuarioOption[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [emEdicao, setEmEdicao] = useState<RegistroDTO | null>(null);
  const [aExcluir, setAExcluir] = useState<RegistroDTO | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const abrirNovo = () => {
    setEmEdicao(null);
    setDialogOpen(true);
  };

  const abrirEdicao = (registro: RegistroDTO) => {
    setEmEdicao(registro);
    setDialogOpen(true);
  };

  async function confirmar(values: RegistroValues) {
    setSubmitting(true);
    const result = emEdicao
      ? await atualizarRegistroAction(instalacaoId, emEdicao.id, values)
      : await criarRegistroAction(instalacaoId, values);

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
    const result = await excluirRegistroAction(instalacaoId, aExcluir.id);

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
          description="Registre visitas, atualizações internas, materiais e pendências."
        />
      ) : (
        <div className="space-y-3">
          {registros.map((registro) => (
            <RegistroCard
              key={registro.id}
              registro={registro}
              readOnly={readOnly}
              onEditar={abrirEdicao}
              onExcluir={setAExcluir}
            />
          ))}
        </div>
      )}

      <RegistroDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        registro={emEdicao}
        submitting={submitting}
        onConfirm={confirmar}
        tecnicos={tecnicos}
      />

      <ConfirmDialog
        open={aExcluir !== null}
        onOpenChange={(open) => {
          if (!open) setAExcluir(null);
        }}
        title="Excluir registro"
        description="O acontecimento será removido da cronologia. Registros com custos lançados não podem ser excluídos."
        onConfirm={confirmarExclusao}
      />
    </div>
  );
}
