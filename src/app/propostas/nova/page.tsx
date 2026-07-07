import type { Metadata } from "next";

import { NovaPropostaWorkspace } from "@/features/propostas";
import { getPropostaFormOptions } from "@/services/proposta.service";
import { listProdutos } from "@/services/produto.service";

export const metadata: Metadata = { title: "Nova proposta" };

export const dynamic = "force-dynamic";

export default async function NovaPropostaPage() {
  const [produtosData, { vendedores }] = await Promise.all([
    listProdutos(false),
    getPropostaFormOptions(),
  ]);

  return (
    <NovaPropostaWorkspace
      produtosData={produtosData}
      vendedores={vendedores}
    />
  );
}
