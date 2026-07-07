-- Refino do fluxo de Propostas (pré-2.3):
--  • status reduzido a RASCUNHO/EMITIDA/CANCELADA
--  • clienteId opcional (estado temporário de montagem; exigido só na emissão)
--  • evento de auditoria EMISSAO
--  • emittedAt por revisão (congelamento/histórico/PDF)

-- AlterEnum
ALTER TYPE "EventoAuditoria" ADD VALUE 'EMISSAO';

-- Proteção: mapeia status descontinuados para EMITIDA antes de recriar o tipo
-- (o cast USING falharia em linhas com APROVADA/REPROVADA).
UPDATE "propostas" SET "status" = 'EMITIDA'
WHERE "status" IN ('APROVADA', 'REPROVADA');

-- AlterEnum (recria o tipo sem APROVADA/REPROVADA)
BEGIN;
CREATE TYPE "StatusProposta_new" AS ENUM ('RASCUNHO', 'EMITIDA', 'CANCELADA');
ALTER TABLE "public"."propostas" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "propostas" ALTER COLUMN "status" TYPE "StatusProposta_new" USING ("status"::text::"StatusProposta_new");
ALTER TYPE "StatusProposta" RENAME TO "StatusProposta_old";
ALTER TYPE "StatusProposta_new" RENAME TO "StatusProposta";
DROP TYPE "public"."StatusProposta_old";
ALTER TABLE "propostas" ALTER COLUMN "status" SET DEFAULT 'RASCUNHO';
COMMIT;

-- DropForeignKey
ALTER TABLE "propostas" DROP CONSTRAINT "propostas_clienteId_fkey";

-- AlterTable
ALTER TABLE "proposta_revisoes" ADD COLUMN     "emittedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "propostas" DROP COLUMN "aprovadaAt",
DROP COLUMN "reprovadaAt",
ALTER COLUMN "clienteId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "propostas" ADD CONSTRAINT "propostas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
