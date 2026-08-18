-- Sprint 4.0.1 — Fundação do módulo de Instalações.
-- Aditiva: nenhuma tabela existente é alterada além do lado inverso das
-- relações (que não gera DDL). Nenhum campo do módulo Comercial muda.
--
-- Numeração comercial própria, independente de propostas, iniciando em 1001 e
-- nunca reutilizada — mesmo padrão do ADR-0201.
--
-- O endereço é SNAPSHOT do Cliente, derivado no service a partir do registro
-- persistido (ADR-0400). `enderecoNumero` evita colisão com `numero`, que é a
-- numeração comercial da instalação.

-- CreateEnum
CREATE TYPE "StatusInstalacao" AS ENUM ('A_AGENDAR', 'AGENDADA', 'AGUARDANDO_MATERIAL', 'EM_ANDAMENTO', 'ADIADA', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EventoInstalacao" AS ENUM ('CRIACAO', 'ALTERACAO', 'MUDANCA_STATUS', 'CANCELAMENTO');

-- CreateTable
CREATE TABLE "instalacoes" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "clienteId" TEXT NOT NULL,
    "propostaId" TEXT,
    "responsavelAtual" TEXT,
    "nomeProjeto" TEXT NOT NULL,
    "status" "StatusInstalacao" NOT NULL DEFAULT 'A_AGENDAR',
    "cep" TEXT,
    "enderecoLogradouro" TEXT,
    "enderecoNumero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "dataPrevista" TIMESTAMP(3),
    "dataAgendada" TIMESTAMP(3),
    "periodo" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instalacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instalacao_auditorias" (
    "id" TEXT NOT NULL,
    "instalacaoId" TEXT NOT NULL,
    "evento" "EventoInstalacao" NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instalacao_auditorias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instalacoes_numero_key" ON "instalacoes"("numero");

-- CreateIndex
CREATE INDEX "instalacoes_clienteId_idx" ON "instalacoes"("clienteId");

-- CreateIndex
CREATE INDEX "instalacoes_status_idx" ON "instalacoes"("status");

-- CreateIndex
CREATE INDEX "instalacao_auditorias_instalacaoId_idx" ON "instalacao_auditorias"("instalacaoId");

-- AddForeignKey
ALTER TABLE "instalacoes" ADD CONSTRAINT "instalacoes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instalacoes" ADD CONSTRAINT "instalacoes_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "propostas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instalacao_auditorias" ADD CONSTRAINT "instalacao_auditorias_instalacaoId_fkey" FOREIGN KEY ("instalacaoId") REFERENCES "instalacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Numeração comercial: sequência própria iniciando em 1001 (ADR-0201).
CREATE SEQUENCE instalacoes_numero_seq;
ALTER TABLE "instalacoes" ALTER COLUMN "numero" SET DEFAULT nextval('instalacoes_numero_seq');
ALTER SEQUENCE instalacoes_numero_seq OWNED BY "instalacoes"."numero";
ALTER SEQUENCE instalacoes_numero_seq RESTART WITH 1001;
