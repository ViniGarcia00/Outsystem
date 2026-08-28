-- Sprint 4.3 — anexos do registro da cronologia (ADR-0414).
--
-- 1:N por registro. O banco e a AUTORIDADE: arquivo orfao em disco e tolerado e
-- logavel; linha apontando para arquivo inexistente e o estado a evitar. Essa
-- assimetria e o que fixa a ordem das operacoes no service.
--
-- `caminhoRelativo` guarda o caminho RELATIVO a raiz de uploads, com
-- separadores POSIX. Caminho absoluto nunca e persistido -- ele depende do
-- servidor e de UPLOAD_PATH, que mudam entre ambientes.
--
-- ON DELETE CASCADE: anexo e conteudo do registro. O bloqueio de exclusao por
-- custos (ADR-0401) continua valendo e e anterior a isto -- ele existe por razao
-- financeira, que nao se aplica a arquivo.
CREATE TABLE "instalacao_registro_anexos" (
    "id" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "nomeArmazenado" TEXT NOT NULL,
    "caminhoRelativo" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instalacao_registro_anexos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "instalacao_registro_anexos_registroId_idx"
    ON "instalacao_registro_anexos"("registroId");

ALTER TABLE "instalacao_registro_anexos"
    ADD CONSTRAINT "instalacao_registro_anexos_registroId_fkey"
    FOREIGN KEY ("registroId") REFERENCES "instalacao_registros"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
