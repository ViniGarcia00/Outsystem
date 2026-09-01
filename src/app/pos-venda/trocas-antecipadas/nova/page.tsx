import type { Metadata } from "next";

import { NovaTrocaForm } from "@/features/pos-venda";
import { listUsuarioOptionsAtivos } from "@/services/usuario.service";

export const metadata: Metadata = { title: "Nova troca antecipada" };

export const dynamic = "force-dynamic";

export default async function NovaTrocaPage() {
  // Criação não tem vínculo prévio: só os ATIVOS. A Troca **não exige papel**
  // (ADR-0422) — acompanhar envio, devolução, frete e cobrança é trabalho
  // frequentemente administrativo. Quem exige `ehTecnico` é a Ordem de Serviço.
  const responsaveis = await listUsuarioOptionsAtivos();
  return <NovaTrocaForm responsaveis={responsaveis} />;
}
