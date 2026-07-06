import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Seed de dados FICTÍCIOS para testes (Sprint 0).
 *
 * Requer um PostgreSQL acessível via DATABASE_URL e a migration aplicada
 * (`npm run db:migrate:deploy`). Como os models ainda são estruturais,
 * o seed preenche apenas o identificador `nome` de cada cadastro.
 *
 * Executar: `npm run db:seed`
 */

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const CLIENTES = [
  "Construtora Horizonte Ltda",
  "Studio Arquitetura Flávio",
  "Condomínio Parque das Águas",
  "Comercial São Jorge ME",
  "Residência Família Andrade",
];

const VENDEDORES = ["Ana Souza", "Bruno Lima", "Carla Mendes"];

const PRODUTOS = [
  "Roteador Wi-Fi 6 Dual Band",
  "Access Point PoE Teto",
  "Switch Gerenciável 24 Portas",
  "Switch PoE 8 Portas",
  "Cabo de Rede Cat6 (caixa 305m)",
  "Patch Panel 24 Portas",
  "Rack de Parede 8U",
  "Caixa de Som Embutir 6''",
  "Caixa de Som Embutir 8''",
  "Amplificador de Áudio 4 Zonas",
  "Central de Áudio Multiroom",
  "Subwoofer Ativo 10''",
  "Soundbar Residencial",
  "Controlador de Volume por Zona",
  "Nobreak 1500VA",
  "Câmera IP Bullet 4MP",
  "Gravador NVR 8 Canais",
  "Fonte de Alimentação 12V 5A",
  "Conector RJ45 (pacote 100un)",
  "Kit Ferramenta de Rede",
];

async function main() {
  // Limpa apenas os cadastros base (ordem segura — sem propostas no seed).
  await prisma.produto.deleteMany();
  await prisma.vendedor.deleteMany();
  await prisma.cliente.deleteMany();

  await prisma.cliente.createMany({
    data: CLIENTES.map((nome) => ({ nome })),
  });

  await prisma.vendedor.createMany({
    data: VENDEDORES.map((nome) => ({ nome })),
  });

  await prisma.produto.createMany({
    data: PRODUTOS.map((nome) => ({ nome })),
  });

  // Garante o registro único de configuração (singleton).
  await prisma.configuracaoSistema.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const [clientes, vendedores, produtos] = await Promise.all([
    prisma.cliente.count(),
    prisma.vendedor.count(),
    prisma.produto.count(),
  ]);

  console.log(
    `Seed concluído: ${clientes} clientes, ${vendedores} vendedores, ${produtos} produtos.`,
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
