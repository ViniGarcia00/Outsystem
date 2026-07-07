-- CreateEnum
CREATE TYPE "StatusProposta" AS ENUM ('RASCUNHO', 'EMITIDA', 'APROVADA', 'REPROVADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "MotivoCancelamento" AS ENUM ('CLIENTE_DESISTIU', 'CONCORRENCIA', 'PROJETO_CANCELADO', 'ERRO_PROPOSTA', 'PROPOSTA_SUBSTITUIDA', 'OUTRO');

-- CreateEnum
CREATE TYPE "EventoAuditoria" AS ENUM ('CRIACAO', 'ALTERACAO', 'NOVA_REVISAO', 'DUPLICACAO', 'MUDANCA_STATUS', 'CANCELAMENTO');

-- AlterTable
CREATE SEQUENCE propostas_proposalnumber_seq;
ALTER TABLE "propostas" ADD COLUMN     "aprovadaAt" TIMESTAMP(3),
ADD COLUMN     "canceladaAt" TIMESTAMP(3),
ADD COLUMN     "emitidaAt" TIMESTAMP(3),
ADD COLUMN     "motivoCancelamento" "MotivoCancelamento",
ADD COLUMN     "obsCancelamento" TEXT,
ADD COLUMN     "obsInternas" TEXT,
ADD COLUMN     "obsProposta" TEXT,
ADD COLUMN     "reprovadaAt" TIMESTAMP(3),
ADD COLUMN     "status" "StatusProposta" NOT NULL DEFAULT 'RASCUNHO',
ADD COLUMN     "validadeDias" INTEGER NOT NULL DEFAULT 5,
ALTER COLUMN "proposalNumber" SET DEFAULT nextval('propostas_proposalnumber_seq');
ALTER SEQUENCE propostas_proposalnumber_seq OWNED BY "propostas"."proposalNumber";

-- Numeração sequencial inicia em 1001 (ADR-0201).
ALTER SEQUENCE propostas_proposalnumber_seq RESTART WITH 1001;

-- CreateTable
CREATE TABLE "proposta_auditorias" (
    "id" TEXT NOT NULL,
    "propostaId" TEXT NOT NULL,
    "evento" "EventoAuditoria" NOT NULL,
    "revisionNumber" INTEGER,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposta_auditorias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proposta_auditorias_propostaId_idx" ON "proposta_auditorias"("propostaId");

-- CreateIndex
CREATE INDEX "propostas_status_idx" ON "propostas"("status");

-- AddForeignKey
ALTER TABLE "proposta_auditorias" ADD CONSTRAINT "proposta_auditorias_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "propostas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
