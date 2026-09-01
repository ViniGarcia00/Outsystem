-- Sprint 4.6 -- Modulo Pos-venda: Troca Antecipada e Ordem de Servico.
--
-- ADITIVA. DOZE tabelas novas, todas com prefixo `pos_venda_`, e cinco enums
-- novos. Sao SEIS por processo: raiz, itens, registros, custos, anexos e
-- auditoria -- esta ultima exigida pela spec 46 (registrar criacao, status,
-- finalizacao, cancelamento e vinculo), no padrao de `proposta_auditorias` e
-- `instalacao_auditorias`. NENHUMA tabela existente muda de estrutura: as unicas relacoes com
-- `clientes`, `produtos` e `usuarios` sao FKs saindo das tabelas novas, e o
-- lado inverso no schema Prisma nao gera DDL. Sem DROP, sem perda de dados,
-- sem backfill.
--
-- DOIS processos distintos (ADR-0418):
--   Troca Antecipada  responde "o produto defeituoso voltou?"
--   Ordem de Servico  responde "qual era o defeito, e o que foi feito?"
-- A OS existe SEM Troca -- `trocaAntecipadaId` e opcional.
--
-- CARDINALIDADE Troca <-> OS (ADR-0419): o UNIQUE em
-- `pos_venda_ordens_servico.trocaAntecipadaId` e o que garante "zero ou UMA OS
-- por Troca". A regra mora no banco, nao em codigo. Multiplas OS por Troca
-- ficaram no BACKLOG; quando entrarem, basta DROP deste indice.
--
-- ORIGEM da OS NAO e coluna: e derivada de `trocaAntecipadaId IS NULL`. Uma
-- coluna seria um segundo lugar onde a mesma verdade mora.
--
-- FKs (spec 48):
--   Cliente / Produto / Usuario -> RESTRICT  (cadastro usado nunca e excluido)
--   OS -> Troca                 -> RESTRICT  (apagar a Troca nao arrasta a OS)
--   filhos operacionais         -> CASCADE   (itens, registros, custos, anexos,
--                                             auditorias sao conteudo do agregado)
--
-- NUMERACAO: sequencias PROPRIAS e INDEPENDENTES, iniciando em 1001, nunca
-- reutilizadas -- mesmo padrao do ADR-0201 e das Instalacoes. Nunca
-- MAX(numero)+1; nunca o `id` na tela.

-- CreateEnum
CREATE TYPE "StatusTrocaAntecipada" AS ENUM ('ABERTA', 'ENVIO_PENDENTE', 'DEVOLUCAO_PENDENTE', 'EM_ANALISE', 'VALOR_PENDENTE', 'FINALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "DestinatarioTroca" AS ENUM ('CLIENTE', 'INSTALADOR', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusOrdemServicoPosVenda" AS ENUM ('ABERTA', 'AGUARDANDO_ANALISE', 'EM_ANALISE', 'EM_MANUTENCAO', 'AGUARDANDO_PECA', 'FINALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "CategoriaCustoPosVenda" AS ENUM ('MOTOBOY', 'SEDEX', 'FRETE', 'VISITA', 'PECA', 'MATERIAL', 'TERCEIRIZACAO', 'OUTROS');

-- CreateEnum
CREATE TYPE "EventoPosVenda" AS ENUM ('CRIACAO', 'ALTERACAO', 'MUDANCA_STATUS', 'FINALIZACAO', 'CANCELAMENTO', 'VINCULO');

-- CreateTable
CREATE TABLE "pos_venda_trocas" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "clienteId" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "responsavelId" TEXT,
    "relatoInicial" TEXT,
    "status" "StatusTrocaAntecipada" NOT NULL DEFAULT 'ABERTA',
    "destinatarioTipo" "DestinatarioTroca" NOT NULL DEFAULT 'CLIENTE',
    "destinatarioNome" TEXT,
    "diagnosticoConclusao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finalizadaEm" TIMESTAMP(3),
    "canceladaEm" TIMESTAMP(3),

    CONSTRAINT "pos_venda_trocas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_venda_troca_itens" (
    "id" TEXT NOT NULL,
    "trocaAntecipadaId" TEXT NOT NULL,
    "produtoId" TEXT,
    "descricaoManual" TEXT,
    "quantidadeEnviada" INTEGER NOT NULL DEFAULT 0,
    "quantidadeEsperadaRetorno" INTEGER NOT NULL DEFAULT 0,
    "quantidadeDevolvida" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_venda_troca_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_venda_troca_registros" (
    "id" TEXT NOT NULL,
    "trocaAntecipadaId" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "responsavelNome" TEXT NOT NULL,
    "relato" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_venda_troca_registros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_venda_troca_custos" (
    "id" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "categoria" "CategoriaCustoPosVenda" NOT NULL,
    "descricao" TEXT,
    "valor" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_venda_troca_custos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_venda_troca_anexos" (
    "id" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "nomeArmazenado" TEXT NOT NULL,
    "caminhoRelativo" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_venda_troca_anexos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_venda_troca_auditorias" (
    "id" TEXT NOT NULL,
    "trocaAntecipadaId" TEXT NOT NULL,
    "evento" "EventoPosVenda" NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_venda_troca_auditorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_venda_ordens_servico" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "clienteId" TEXT NOT NULL,
    "trocaAntecipadaId" TEXT,
    "referencia" TEXT NOT NULL,
    "responsavelId" TEXT,
    "relatoInicial" TEXT,
    "status" "StatusOrdemServicoPosVenda" NOT NULL DEFAULT 'ABERTA',
    "diagnosticoConclusao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finalizadaEm" TIMESTAMP(3),
    "canceladaEm" TIMESTAMP(3),

    CONSTRAINT "pos_venda_ordens_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_venda_os_itens" (
    "id" TEXT NOT NULL,
    "ordemServicoId" TEXT NOT NULL,
    "produtoId" TEXT,
    "descricaoManual" TEXT,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "diagnosticoItem" TEXT,
    "solucaoItem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_venda_os_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_venda_os_registros" (
    "id" TEXT NOT NULL,
    "ordemServicoId" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "responsavelNome" TEXT NOT NULL,
    "relato" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_venda_os_registros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_venda_os_custos" (
    "id" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "categoria" "CategoriaCustoPosVenda" NOT NULL,
    "descricao" TEXT,
    "valor" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_venda_os_custos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_venda_os_anexos" (
    "id" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "nomeArmazenado" TEXT NOT NULL,
    "caminhoRelativo" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_venda_os_anexos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_venda_os_auditorias" (
    "id" TEXT NOT NULL,
    "ordemServicoId" TEXT NOT NULL,
    "evento" "EventoPosVenda" NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_venda_os_auditorias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pos_venda_trocas_numero_key" ON "pos_venda_trocas"("numero");

-- CreateIndex
CREATE INDEX "pos_venda_trocas_clienteId_idx" ON "pos_venda_trocas"("clienteId");

-- CreateIndex
CREATE INDEX "pos_venda_trocas_responsavelId_idx" ON "pos_venda_trocas"("responsavelId");

-- CreateIndex
CREATE INDEX "pos_venda_trocas_status_idx" ON "pos_venda_trocas"("status");

-- CreateIndex
CREATE INDEX "pos_venda_trocas_updatedAt_idx" ON "pos_venda_trocas"("updatedAt");

-- CreateIndex
CREATE INDEX "pos_venda_troca_itens_trocaAntecipadaId_idx" ON "pos_venda_troca_itens"("trocaAntecipadaId");

-- CreateIndex
CREATE INDEX "pos_venda_troca_itens_produtoId_idx" ON "pos_venda_troca_itens"("produtoId");

-- CreateIndex
CREATE INDEX "pos_venda_troca_registros_trocaAntecipadaId_dataHora_idx" ON "pos_venda_troca_registros"("trocaAntecipadaId", "dataHora");

-- CreateIndex
CREATE INDEX "pos_venda_troca_registros_responsavelId_idx" ON "pos_venda_troca_registros"("responsavelId");

-- CreateIndex
CREATE INDEX "pos_venda_troca_custos_registroId_idx" ON "pos_venda_troca_custos"("registroId");

-- CreateIndex
CREATE INDEX "pos_venda_troca_anexos_registroId_idx" ON "pos_venda_troca_anexos"("registroId");

-- CreateIndex
CREATE INDEX "pos_venda_troca_auditorias_trocaAntecipadaId_idx" ON "pos_venda_troca_auditorias"("trocaAntecipadaId");

-- CreateIndex
CREATE UNIQUE INDEX "pos_venda_ordens_servico_numero_key" ON "pos_venda_ordens_servico"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "pos_venda_ordens_servico_trocaAntecipadaId_key" ON "pos_venda_ordens_servico"("trocaAntecipadaId");

-- CreateIndex
CREATE INDEX "pos_venda_ordens_servico_clienteId_idx" ON "pos_venda_ordens_servico"("clienteId");

-- CreateIndex
CREATE INDEX "pos_venda_ordens_servico_responsavelId_idx" ON "pos_venda_ordens_servico"("responsavelId");

-- CreateIndex
CREATE INDEX "pos_venda_ordens_servico_status_idx" ON "pos_venda_ordens_servico"("status");

-- CreateIndex
CREATE INDEX "pos_venda_ordens_servico_updatedAt_idx" ON "pos_venda_ordens_servico"("updatedAt");

-- CreateIndex
CREATE INDEX "pos_venda_os_itens_ordemServicoId_idx" ON "pos_venda_os_itens"("ordemServicoId");

-- CreateIndex
CREATE INDEX "pos_venda_os_itens_produtoId_idx" ON "pos_venda_os_itens"("produtoId");

-- CreateIndex
CREATE INDEX "pos_venda_os_registros_ordemServicoId_dataHora_idx" ON "pos_venda_os_registros"("ordemServicoId", "dataHora");

-- CreateIndex
CREATE INDEX "pos_venda_os_registros_responsavelId_idx" ON "pos_venda_os_registros"("responsavelId");

-- CreateIndex
CREATE INDEX "pos_venda_os_custos_registroId_idx" ON "pos_venda_os_custos"("registroId");

-- CreateIndex
CREATE INDEX "pos_venda_os_anexos_registroId_idx" ON "pos_venda_os_anexos"("registroId");

-- CreateIndex
CREATE INDEX "pos_venda_os_auditorias_ordemServicoId_idx" ON "pos_venda_os_auditorias"("ordemServicoId");

-- AddForeignKey
ALTER TABLE "pos_venda_trocas" ADD CONSTRAINT "pos_venda_trocas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_venda_trocas" ADD CONSTRAINT "pos_venda_trocas_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_venda_troca_itens" ADD CONSTRAINT "pos_venda_troca_itens_trocaAntecipadaId_fkey" FOREIGN KEY ("trocaAntecipadaId") REFERENCES "pos_venda_trocas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_venda_troca_itens" ADD CONSTRAINT "pos_venda_troca_itens_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_venda_troca_registros" ADD CONSTRAINT "pos_venda_troca_registros_trocaAntecipadaId_fkey" FOREIGN KEY ("trocaAntecipadaId") REFERENCES "pos_venda_trocas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_venda_troca_registros" ADD CONSTRAINT "pos_venda_troca_registros_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_venda_troca_custos" ADD CONSTRAINT "pos_venda_troca_custos_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "pos_venda_troca_registros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_venda_troca_anexos" ADD CONSTRAINT "pos_venda_troca_anexos_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "pos_venda_troca_registros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_venda_troca_auditorias" ADD CONSTRAINT "pos_venda_troca_auditorias_trocaAntecipadaId_fkey" FOREIGN KEY ("trocaAntecipadaId") REFERENCES "pos_venda_trocas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_venda_ordens_servico" ADD CONSTRAINT "pos_venda_ordens_servico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_venda_ordens_servico" ADD CONSTRAINT "pos_venda_ordens_servico_trocaAntecipadaId_fkey" FOREIGN KEY ("trocaAntecipadaId") REFERENCES "pos_venda_trocas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_venda_ordens_servico" ADD CONSTRAINT "pos_venda_ordens_servico_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_venda_os_itens" ADD CONSTRAINT "pos_venda_os_itens_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "pos_venda_ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_venda_os_itens" ADD CONSTRAINT "pos_venda_os_itens_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_venda_os_registros" ADD CONSTRAINT "pos_venda_os_registros_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "pos_venda_ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_venda_os_registros" ADD CONSTRAINT "pos_venda_os_registros_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_venda_os_custos" ADD CONSTRAINT "pos_venda_os_custos_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "pos_venda_os_registros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_venda_os_anexos" ADD CONSTRAINT "pos_venda_os_anexos_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "pos_venda_os_registros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_venda_os_auditorias" ADD CONSTRAINT "pos_venda_os_auditorias_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "pos_venda_ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Numeracao operacional: sequencias proprias iniciando em 1001 (ADR-0201).
-- Duas sequencias INDEPENDENTES -- a Troca 1001 e a OS 1001 sao numeros de
-- processos diferentes, e o modulo ja contextualiza qual e qual.
CREATE SEQUENCE pos_venda_trocas_numero_seq;
ALTER TABLE "pos_venda_trocas" ALTER COLUMN "numero" SET DEFAULT nextval('pos_venda_trocas_numero_seq');
ALTER SEQUENCE pos_venda_trocas_numero_seq OWNED BY "pos_venda_trocas"."numero";
ALTER SEQUENCE pos_venda_trocas_numero_seq RESTART WITH 1001;

CREATE SEQUENCE pos_venda_ordens_servico_numero_seq;
ALTER TABLE "pos_venda_ordens_servico" ALTER COLUMN "numero" SET DEFAULT nextval('pos_venda_ordens_servico_numero_seq');
ALTER SEQUENCE pos_venda_ordens_servico_numero_seq OWNED BY "pos_venda_ordens_servico"."numero";
ALTER SEQUENCE pos_venda_ordens_servico_numero_seq RESTART WITH 1001;
