import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PropostaForm } from "@/features/propostas";
import { MOTIVO_LABEL } from "@/features/propostas/labels";
import {
  getPropostaForEdit,
  getPropostaFormOptions,
} from "@/services/proposta.service";

export const metadata: Metadata = { title: "Proposta" };

export const dynamic = "force-dynamic";

export default async function EditarPropostaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [dto, options] = await Promise.all([
    getPropostaForEdit(id),
    getPropostaFormOptions(),
  ]);
  if (!dto) notFound();

  const cancelInfo = dto.motivoCancelamento
    ? {
        motivoLabel: MOTIVO_LABEL[dto.motivoCancelamento],
        obs: dto.obsCancelamento,
      }
    : undefined;

  return (
    <PropostaForm
      propostaId={id}
      defaultValues={{
        clienteId: dto.clienteId,
        vendedorId: dto.vendedorId,
        modelo: dto.modelo,
        validadeDias: dto.validadeDias,
        obsInternas: dto.obsInternas,
        obsProposta: dto.obsProposta,
        status: dto.status,
      }}
      clientes={options.clientes}
      vendedores={options.vendedores}
      proposalNumber={dto.proposalNumber}
      revisaoAtual={dto.revisaoAtual}
      currentStatus={dto.status}
      clienteNome={dto.clienteNome}
      cancelInfo={cancelInfo}
      readOnly={dto.readOnly}
    />
  );
}
