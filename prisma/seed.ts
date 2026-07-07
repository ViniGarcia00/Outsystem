import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Seed de dados de exemplo para desenvolvimento/testes (Sprint 1).
 *
 * Requer um PostgreSQL acessível via DATABASE_URL e a migration aplicada
 * (`npm run db:migrate:deploy`). Popula os cadastros base (Clientes, Produtos,
 * Vendedores) e garante o singleton de Configuração do Sistema.
 *
 * Executar: `npm run db:seed`
 */

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// CPF/CNPJ válidos (dígitos verificadores corretos) para exemplo.
const CLIENTES = [
  {
    tipoPessoa: "PJ" as const,
    empresa: "Construtora Horizonte Ltda",
    cpfCnpj: "11.222.333/0001-81",
    cidade: "Belo Horizonte",
    estado: "MG",
    telefone: "(31) 3333-4444",
    email: "contato@horizonte.com.br",
  },
  {
    tipoPessoa: "PF" as const,
    nome: "Flávio Andrade",
    cpfCnpj: "529.982.247-25",
    cidade: "Contagem",
    estado: "MG",
    telefone: "(31) 98888-7777",
    email: "flavio.andrade@email.com",
  },
  {
    tipoPessoa: "PJ" as const,
    empresa: "Comercial São Jorge ME",
    cidade: "Betim",
    estado: "MG",
  },
  {
    tipoPessoa: "PF" as const,
    nome: "Maria Oliveira",
    cidade: "Nova Lima",
    estado: "MG",
    telefone: "(31) 97777-6666",
  },
  {
    tipoPessoa: "PF" as const,
    nome: "Residência Família Ribeiro",
    cidade: "Sabará",
    estado: "MG",
  },
];

const VENDEDORES = [
  { nome: "Ana Souza", telefone: "(31) 99999-1111", email: "ana@outmat.com.br" },
  { nome: "Bruno Lima", telefone: "(31) 99999-2222" },
  { nome: "Carla Mendes", email: "carla@outmat.com.br" },
];

const PRODUTOS = [
  { codigo: "RTR-001", descricao: "Roteador Wi-Fi 6 Dual Band", valorProduto: 899.9, valorServico: 150 },
  { codigo: "AP-002", descricao: "Access Point PoE de Teto", valorProduto: 649.0, valorServico: 120 },
  { codigo: "SW-024", descricao: "Switch Gerenciável 24 Portas", valorProduto: 1890.0, valorServico: 200 },
  { codigo: "SW-P08", descricao: "Switch PoE 8 Portas", valorProduto: 720.0, valorServico: 90 },
  { codigo: "CAB-C6", descricao: "Cabo de Rede Cat6 (caixa 305m)", valorProduto: 560.0, valorServico: 0 },
  { codigo: "PP-024", descricao: "Patch Panel 24 Portas", valorProduto: 240.0, valorServico: 60 },
  { codigo: "RCK-8U", descricao: "Rack de Parede 8U", valorProduto: 430.0, valorServico: 110 },
  { codigo: "SPK-06", descricao: 'Caixa de Som de Embutir 6"', valorProduto: 189.9, valorServico: 45 },
  { codigo: "SPK-08", descricao: 'Caixa de Som de Embutir 8"', valorProduto: 239.9, valorServico: 45 },
  { codigo: "AMP-4Z", descricao: "Amplificador de Áudio 4 Zonas", valorProduto: 1290.0, valorServico: 180 },
  { codigo: "AUD-MR", descricao: "Central de Áudio Multiroom", valorProduto: 2490.0, valorServico: 300 },
  { codigo: "SUB-10", descricao: 'Subwoofer Ativo 10"', valorProduto: 990.0, valorServico: 60 },
  { codigo: "NBK-15", descricao: "Nobreak 1500VA", valorProduto: 780.0, valorServico: 0 },
  { codigo: "CAM-4M", descricao: "Câmera IP Bullet 4MP", valorProduto: 349.0, valorServico: 80 },
  { codigo: "NVR-08", descricao: "Gravador NVR 8 Canais", valorProduto: 890.0, valorServico: 150 },
];

async function main() {
  // Ordem segura de limpeza (propostas primeiro — FK para cliente/vendedor).
  await prisma.proposta.deleteMany(); // cascata: revisões + auditorias
  await prisma.produto.deleteMany();
  await prisma.vendedor.deleteMany();
  await prisma.cliente.deleteMany();

  await prisma.cliente.createMany({ data: CLIENTES });
  await prisma.vendedor.createMany({ data: VENDEDORES });
  await prisma.produto.createMany({ data: PRODUTOS });

  // Configuração do sistema (singleton) com dados de exemplo.
  await prisma.configuracaoSistema.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      nomeEmpresa: "Outmat",
      razaoSocial: "Outmat Tecnologia Ltda",
      cnpj: "11.222.333/0001-81",
      cidade: "Belo Horizonte",
      estado: "MG",
      telefone: "(31) 3333-0000",
      whatsapp: "(31) 99999-0000",
      email: "contato@outmat.com.br",
      site: "https://www.outmat.com.br",
      corPrimaria: "#0F172A",
      corSecundaria: "#2563EB",
      textoQuemSomos:
        "A Outmat oferece soluções em redes, áudio e automação para residências e empresas.",
      textoFinalProposta:
        "Agradecemos a oportunidade. Esta proposta é válida por 15 dias.",
    },
  });

  // Propostas de exemplo (fundação — sem produtos/serviços). Cada uma nasce com
  // Rev.0 + auditoria de criação.
  const clientesList = await prisma.cliente.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  const vendedoresList = await prisma.vendedor.findMany({
    select: { id: true },
    orderBy: { nome: "asc" },
  });

  const produtosSnap = await prisma.produto.findMany({
    select: {
      id: true,
      codigo: true,
      descricao: true,
      unidade: true,
      valorProduto: true,
      valorServico: true,
    },
  });
  const produtoPorCodigo = new Map(produtosSnap.map((p) => [p.codigo, p]));

  async function criarPropostaSeed(data: {
    clienteId: string;
    vendedorId?: string;
    modelo: "COMERCIAL" | "SIMPLIFICADA";
    status: "RASCUNHO" | "EMITIDA" | "CANCELADA";
    obsProposta?: string;
    conteudo?: {
      secao: string;
      itens: { codigo: string; quantidade: number }[];
    }[];
  }) {
    const p = await prisma.proposta.create({
      data: {
        clienteId: data.clienteId,
        vendedorId: data.vendedorId ?? null,
        modelo: data.modelo,
        status: data.status,
        obsProposta: data.obsProposta ?? null,
        emitidaAt: data.status === "EMITIDA" ? new Date() : null,
        canceladaAt: data.status === "CANCELADA" ? new Date() : null,
        motivoCancelamento:
          data.status === "CANCELADA" ? "PROPOSTA_SUBSTITUIDA" : null,
      },
      select: { id: true },
    });
    const rev = await prisma.propostaRevisao.create({
      data: { propostaId: p.id, revisionNumber: 0 },
      select: { id: true },
    });
    await prisma.proposta.update({
      where: { id: p.id },
      data: { currentRevisionId: rev.id },
    });
    await prisma.propostaAuditoria.create({
      data: { propostaId: p.id, evento: "CRIACAO", revisionNumber: 0 },
    });

    // Conteúdo de exemplo (seções + produtos com snapshot).
    const secoes = data.conteudo ?? [];
    for (let si = 0; si < secoes.length; si++) {
      const secao = await prisma.propostaSecao.create({
        data: { revisaoId: rev.id, nome: secoes[si].secao, ordem: si },
        select: { id: true },
      });
      for (let ii = 0; ii < secoes[si].itens.length; ii++) {
        const linha = secoes[si].itens[ii];
        const prod = produtoPorCodigo.get(linha.codigo);
        if (!prod) continue;
        await prisma.propostaItem.create({
          data: {
            secaoId: secao.id,
            tipo: "PRODUTO",
            produtoId: prod.id,
            codigo: prod.codigo,
            descricao: prod.descricao,
            unidade: prod.unidade,
            valorProduto: prod.valorProduto,
            valorServico: prod.valorServico,
            quantidade: linha.quantidade,
            ordem: ii,
          },
        });
      }
    }
  }

  if (clientesList.length >= 3) {
    await criarPropostaSeed({
      clienteId: clientesList[0].id,
      vendedorId: vendedoresList[0]?.id,
      modelo: "COMERCIAL",
      status: "RASCUNHO",
      obsProposta: "Proposta inicial de exemplo.",
      conteudo: [
        {
          secao: "Sala",
          itens: [
            { codigo: "RTR-001", quantidade: 1 },
            { codigo: "AP-002", quantidade: 2 },
          ],
        },
        {
          secao: "Cozinha",
          itens: [
            { codigo: "SPK-06", quantidade: 4 },
            { codigo: "CAB-C6", quantidade: 1.5 },
          ],
        },
      ],
    });
    await criarPropostaSeed({
      clienteId: clientesList[1].id,
      vendedorId: vendedoresList[1]?.id,
      modelo: "SIMPLIFICADA",
      status: "EMITIDA",
    });
    await criarPropostaSeed({
      clienteId: clientesList[2].id,
      modelo: "COMERCIAL",
      status: "CANCELADA",
    });
  }

  const [clientes, vendedores, produtos, propostas] = await Promise.all([
    prisma.cliente.count(),
    prisma.vendedor.count(),
    prisma.produto.count(),
    prisma.proposta.count(),
  ]);

  console.log(
    `Seed concluído: ${clientes} clientes, ${vendedores} vendedores, ${produtos} produtos, ${propostas} propostas.`,
  );
}

main()
  .catch((error) => {
    console.error("Falha no seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
