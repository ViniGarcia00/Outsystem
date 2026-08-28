-- Sprint 4.4 — campos contratuais do contrato Rev. 4 (ADR-0416).
--
-- Os tres alimentam o contrato e nada mais. Ficam em `propostas`, no bloco de
-- finalizacao, junto de formaPagamento e previsaoInstalacao.
--
-- prazoExecucaoDiasUteis
--   Prazo CONTRATUAL de execucao, em dias uteis (clausula 3.1). NAO e o
--   previsaoInstalacao: aquele e texto livre comercial ("3 dias", "a combinar")
--   exibido nos PDFs; este e numero, e prazo de CONCLUSAO, e e clausula. O
--   template ja traz "dias uteis" ao lado da tag, entao a variavel fornece so o
--   numero.
--
-- valorParcelaFinal
--   Parcela final exigivel no aceite (Anexo II). INFORMADA, nunca derivada: o
--   sistema nao tem estrutura de parcelas nem registro de valor recebido --
--   `formaPagamento` e texto livre descrevendo o combinado, que sao valores
--   PREVISTOS e nao PAGOS. Extrair isto de uma frase por regex seria fragil num
--   documento que vai para assinatura. DECIMAL, nunca float.
--
-- observacoesAceite
--   Observacoes do Termo de Aceite. Substitui o ultimo placeholder manual do
--   contrato ([se houver]). NAO reaproveita obsInternas, que e anotacao de
--   negociacao e nunca sai do sistema (ADR-0203).
--
-- Todas nullable, aditivas, sem backfill: nenhuma linha existente e alterada e
-- nenhuma proposta antiga passa a ter valor que ninguem informou.
ALTER TABLE "propostas"
  ADD COLUMN "prazoExecucaoDiasUteis" INTEGER,
  ADD COLUMN "valorParcelaFinal" DECIMAL(12,2),
  ADD COLUMN "observacoesAceite" TEXT;
