import type { Metadata } from "next";

import {
  ProdutoForm,
  produtoDefaults,
  type ProdutoFormValues,
} from "@/features/produtos";
import { getProdutoForEdit } from "@/services/produto.service";

export const metadata: Metadata = { title: "Novo produto" };

export const dynamic = "force-dynamic";

/**
 * Novo produto. Quando recebe `?clonarDe=<id>` (Task 2 — Clonar Produto), abre
 * já preenchido com os dados DESCRITIVOS do produto de origem (descrição,
 * unidade, ativo), porém com identidade/preços zerados: SKU vazio, Valor Produto
 * e Valor Serviço em R$ 0,00. Continua sendo uma criação (nenhum produtoId).
 */
export default async function NovoProdutoPage({
  searchParams,
}: {
  searchParams: Promise<{ clonarDe?: string }>;
}) {
  const { clonarDe } = await searchParams;

  let defaultValues: ProdutoFormValues = produtoDefaults;
  let clonado = false;
  if (clonarDe) {
    const origem = await getProdutoForEdit(clonarDe);
    if (origem) {
      clonado = true;
      defaultValues = {
        ativo: origem.ativo,
        descricao: origem.descricao,
        unidade: origem.unidade,
        // Não copiados: identidade e preços.
        codigo: "",
        valorProduto: 0,
        valorServico: 0,
      };
    }
  }

  return <ProdutoForm defaultValues={defaultValues} clonado={clonado} />;
}
