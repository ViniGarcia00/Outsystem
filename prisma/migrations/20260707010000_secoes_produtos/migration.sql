-- CreateEnum
CREATE TYPE "TipoItemProposta" AS ENUM ('PRODUTO', 'SERVICO');

-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "unidade" TEXT NOT NULL DEFAULT 'UN';

-- AlterTable (tabela vazia — propostas do seed têm Rev.0 sem conteúdo)
ALTER TABLE "proposta_itens" ADD COLUMN     "codigo" TEXT NOT NULL,
ADD COLUMN     "descricao" TEXT NOT NULL,
ADD COLUMN     "ordem" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "produtoId" TEXT,
ADD COLUMN     "quantidade" DECIMAL(12,3) NOT NULL DEFAULT 1,
ADD COLUMN     "tipo" "TipoItemProposta" NOT NULL DEFAULT 'PRODUTO',
ADD COLUMN     "unidade" TEXT NOT NULL,
ADD COLUMN     "valorProduto" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "valorServico" DECIMAL(12,2) NOT NULL;

-- AlterTable (tabela vazia)
ALTER TABLE "proposta_secoes" ADD COLUMN     "nome" TEXT NOT NULL,
ADD COLUMN     "ordem" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "proposta_itens_produtoId_idx" ON "proposta_itens"("produtoId");

-- AddForeignKey
ALTER TABLE "proposta_itens" ADD CONSTRAINT "proposta_itens_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
