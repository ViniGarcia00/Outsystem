-- Sprint 2.9.1 — Serviços Complementares (estrutura e cadastro).
-- Nova entidade PropostaServico (Proposta 1..N). Genérica: novos tipos entram
-- apenas no enum, sem mudança de banco. Independente do Conteúdo/Automação e do
-- PDF. Nesta Sprint NÃO altera cálculos (subtotal/desconto/frete/total).
-- Único por (proposta, tipo): no máximo um SOM e um WIFI por proposta.

-- CreateEnum
CREATE TYPE "TipoServicoProposta" AS ENUM ('SOM', 'WIFI');

-- CreateTable
CREATE TABLE "proposta_servicos" (
    "id" TEXT NOT NULL,
    "propostaId" TEXT NOT NULL,
    "tipo" "TipoServicoProposta" NOT NULL,
    "descricao" TEXT,
    "valorProdutos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorServicos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposta_servicos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proposta_servicos_propostaId_idx" ON "proposta_servicos"("propostaId");

-- CreateIndex
CREATE UNIQUE INDEX "proposta_servicos_propostaId_tipo_key" ON "proposta_servicos"("propostaId", "tipo");

-- AddForeignKey
ALTER TABLE "proposta_servicos" ADD CONSTRAINT "proposta_servicos_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "propostas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
