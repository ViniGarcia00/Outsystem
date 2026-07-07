import "dotenv/config";

import { prisma } from "@/infrastructure/database";
import {
  createCliente,
  getClienteForEdit,
  listClientes,
  removeCliente,
  setClienteAtivo,
  updateCliente,
} from "@/services/cliente.service";
import {
  createProduto,
  listProdutos,
  removeProduto,
} from "@/services/produto.service";
import { getConfiguracao, saveConfiguracao } from "@/services/configuracao.service";
import {
  createVendedor,
  removeVendedor,
} from "@/services/vendedor.service";

/**
 * Validação de CRUD contra o PostgreSQL REAL, exercitando a camada de services
 * (as mesmas funções usadas pelas Server Actions), incluindo:
 * unicidade de CPF/CNPJ, inativação e a regra de exclusão por uso em propostas.
 *
 * Executar: `npm run db:validate`
 */

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

async function expectThrows(
  label: string,
  fn: () => Promise<unknown>,
  matcher?: (message: string) => boolean,
) {
  try {
    await fn();
    check(`${label} (deveria falhar)`, false);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check(label, matcher ? matcher(message) : true);
  }
}

const TEST_CPF = "111.444.777-35";

/** Remove artefatos de execuções anteriores (script idempotente). */
async function cleanup() {
  await prisma.proposta.deleteMany({ where: { proposalNumber: 990001 } });
  await prisma.cliente.deleteMany({
    where: {
      OR: [
        { cpfCnpj: TEST_CPF },
        { nome: { in: ["Cliente Teste CRUD", "Cliente Teste CRUD (editado)", "Duplicado"] } },
      ],
    },
  });
  await prisma.produto.deleteMany({ where: { codigo: "TESTE-CRUD" } });
  await prisma.vendedor.deleteMany({ where: { nome: "Vendedor Teste CRUD" } });
}

async function main() {
  console.log("Validação de CRUD (PostgreSQL real)\n");
  await cleanup();

  // --- CONFIGURAÇÃO (singleton) -------------------------------------------
  console.log("Configuração:");
  await saveConfiguracao({ nomeEmpresa: "Outmat (teste)", email: "" });
  const config = await getConfiguracao();
  check("get/upsert singleton", config.nomeEmpresa === "Outmat (teste)");
  check("email vazio normalizado", config.email === "");

  // --- CLIENTES ------------------------------------------------------------
  console.log("\nClientes:");
  const clienteId = await createCliente({
    ativo: true,
    tipoPessoa: "PF",
    nome: "Cliente Teste CRUD",
    cpfCnpj: "111.444.777-35",
  });
  check("create", Boolean(clienteId));

  const carregado = await getClienteForEdit(clienteId);
  check("getForEdit", carregado?.nome === "Cliente Teste CRUD");

  await updateCliente(clienteId, {
    ativo: true,
    tipoPessoa: "PF",
    nome: "Cliente Teste CRUD (editado)",
    cpfCnpj: TEST_CPF, // o formulário sempre envia todos os campos
  });
  const editado = await getClienteForEdit(clienteId);
  check("update", editado?.nome === "Cliente Teste CRUD (editado)");

  await expectThrows(
    "cpfCnpj único (P2002 → mensagem amigável)",
    () =>
      createCliente({
        ativo: true,
        tipoPessoa: "PF",
        nome: "Duplicado",
        cpfCnpj: "111.444.777-35",
      }),
    (m) => m.includes("CPF/CNPJ"),
  );

  await setClienteAtivo(clienteId, false);
  const ativos = await listClientes(false);
  const comInativos = await listClientes(true);
  check(
    "inativar oculta da listagem padrão",
    !ativos.some((c) => c.id === clienteId) &&
      comInativos.some((c) => c.id === clienteId),
  );
  await setClienteAtivo(clienteId, true);

  // Regra de exclusão: cliente usado em proposta não pode ser excluído.
  const proposta = await prisma.proposta.create({
    data: { proposalNumber: 990001, modelo: "COMERCIAL", clienteId },
    select: { id: true },
  });
  await expectThrows(
    "excluir cliente usado em proposta é bloqueado",
    () => removeCliente(clienteId),
    (m) => m.includes("já foi utilizado em propostas"),
  );
  await prisma.proposta.delete({ where: { id: proposta.id } });
  await removeCliente(clienteId);
  check(
    "excluir cliente sem uso é permitido",
    (await getClienteForEdit(clienteId)) === null,
  );

  // --- PRODUTOS ------------------------------------------------------------
  console.log("\nProdutos:");
  const produtoId = await createProduto({
    ativo: true,
    codigo: "TESTE-CRUD",
    descricao: "Produto de teste",
    unidade: "UN",
    valorProduto: 100.5,
    valorServico: 0,
  });
  check("create", Boolean(produtoId));
  await expectThrows(
    "codigo único",
    () =>
      createProduto({
        ativo: true,
        codigo: "TESTE-CRUD",
        descricao: "Duplicado",
        unidade: "UN",
        valorProduto: 1,
        valorServico: 0,
      }),
    (m) => m.includes("código"),
  );
  await removeProduto(produtoId);
  const produtos = await listProdutos(true);
  check(
    "excluir produto é permitido (sem relação com proposta)",
    !produtos.some((p) => p.id === produtoId),
  );

  // --- VENDEDORES ----------------------------------------------------------
  console.log("\nVendedores:");
  const vendedorId = await createVendedor({
    ativo: true,
    nome: "Vendedor Teste CRUD",
  });
  check("create", Boolean(vendedorId));
  await removeVendedor(vendedorId);
  check("excluir vendedor sem uso é permitido", true);

  console.log(`\nResultado: ${passed} ok, ${failed} falha(s).`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("Falha na validação:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
