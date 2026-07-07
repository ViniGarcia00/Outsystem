-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ModeloProposta" AS ENUM ('COMERCIAL', 'SIMPLIFICADA');

-- CreateEnum
CREATE TYPE "TipoPessoa" AS ENUM ('PF', 'PJ');

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "tipoPessoa" "TipoPessoa" NOT NULL DEFAULT 'PF',
    "nome" TEXT,
    "empresa" TEXT,
    "cpfCnpj" TEXT,
    "cep" TEXT,
    "endereco" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valorProduto" DECIMAL(12,2) NOT NULL,
    "valorServico" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendedores" (
    "id" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propostas" (
    "id" TEXT NOT NULL,
    "proposalNumber" INTEGER NOT NULL,
    "modelo" "ModeloProposta" NOT NULL DEFAULT 'COMERCIAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clienteId" TEXT NOT NULL,
    "vendedorId" TEXT,
    "currentRevisionId" TEXT,

    CONSTRAINT "propostas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposta_revisoes" (
    "id" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "propostaId" TEXT NOT NULL,

    CONSTRAINT "proposta_revisoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposta_secoes" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revisaoId" TEXT NOT NULL,

    CONSTRAINT "proposta_secoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposta_itens" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "secaoId" TEXT NOT NULL,

    CONSTRAINT "proposta_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracao_sistema" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "nomeEmpresa" TEXT,
    "razaoSocial" TEXT,
    "cnpj" TEXT,
    "cep" TEXT,
    "endereco" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "site" TEXT,
    "logo" TEXT,
    "corPrimaria" TEXT,
    "corSecundaria" TEXT,
    "textoQuemSomos" TEXT,
    "textoFinalProposta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracao_sistema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cpfCnpj_key" ON "clientes"("cpfCnpj");

-- CreateIndex
CREATE INDEX "clientes_ativo_idx" ON "clientes"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_codigo_key" ON "produtos"("codigo");

-- CreateIndex
CREATE INDEX "produtos_ativo_idx" ON "produtos"("ativo");

-- CreateIndex
CREATE INDEX "vendedores_ativo_idx" ON "vendedores"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "propostas_proposalNumber_key" ON "propostas"("proposalNumber");

-- CreateIndex
CREATE UNIQUE INDEX "propostas_currentRevisionId_key" ON "propostas"("currentRevisionId");

-- CreateIndex
CREATE INDEX "propostas_clienteId_idx" ON "propostas"("clienteId");

-- CreateIndex
CREATE INDEX "propostas_vendedorId_idx" ON "propostas"("vendedorId");

-- CreateIndex
CREATE INDEX "proposta_revisoes_propostaId_idx" ON "proposta_revisoes"("propostaId");

-- CreateIndex
CREATE UNIQUE INDEX "proposta_revisoes_propostaId_revisionNumber_key" ON "proposta_revisoes"("propostaId", "revisionNumber");

-- CreateIndex
CREATE INDEX "proposta_secoes_revisaoId_idx" ON "proposta_secoes"("revisaoId");

-- CreateIndex
CREATE INDEX "proposta_itens_secaoId_idx" ON "proposta_itens"("secaoId");

-- AddForeignKey
ALTER TABLE "propostas" ADD CONSTRAINT "propostas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propostas" ADD CONSTRAINT "propostas_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "vendedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propostas" ADD CONSTRAINT "propostas_currentRevisionId_fkey" FOREIGN KEY ("currentRevisionId") REFERENCES "proposta_revisoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposta_revisoes" ADD CONSTRAINT "proposta_revisoes_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "propostas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposta_secoes" ADD CONSTRAINT "proposta_secoes_revisaoId_fkey" FOREIGN KEY ("revisaoId") REFERENCES "proposta_revisoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposta_itens" ADD CONSTRAINT "proposta_itens_secaoId_fkey" FOREIGN KEY ("secaoId") REFERENCES "proposta_secoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

