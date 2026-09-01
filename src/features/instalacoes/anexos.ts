/**
 * Regras dos anexos do registro da Instalação (Sprint 4.3, ADR-0414).
 *
 * Sem IO, sem Prisma, sem React. O que toca banco ou disco vive em
 * `services/instalacao-anexo.service.ts`.
 *
 * ── O QUE MUDOU NA SPRINT 4.6 (ADR-0421) ────────────────────────────────────
 * Os primitivos NEUTROS de domínio — allowlist de MIME, limites, validação,
 * nome físico, sanitização, `accept` e a regra de segmento de caminho — foram
 * promovidos a `@/lib/anexos`, porque o Pós-venda precisa exatamente das mesmas
 * garantias. A alternativa era escrever a allowlist duas vezes, que é o defeito
 * que o ADR-0402 corrigiu na busca.
 *
 * **A superfície pública deste módulo não mudou.** Tudo continua importável
 * daqui, com o mesmo nome e o mesmo comportamento — nenhum call site foi
 * tocado, e o teste desta pasta continua valendo palavra por palavra. O que
 * permanece PRÓPRIO daqui são os construtores de caminho: cada módulo
 * particiona os uploads do seu jeito, e o de Instalações é
 * `instalacoes/<instalacaoId>/registros/<registroId>/`.
 */

export {
  ACCEPT_ANEXO,
  ANEXO_LIMITE_EXCEDIDO,
  ANEXO_MAXIMO_ATINGIDO,
  ANEXO_NAO_ENCONTRADO,
  ANEXO_TIPO_RECUSADO,
  ANEXO_VAZIO,
  EXTENSOES_ACEITAS,
  MAX_BYTES,
  MAX_POR_REGISTRO,
  MIME_ACEITOS,
  extensaoDe,
  formatarTamanho,
  nomeFisico,
  sanitizarNomeOriginal,
  validarArquivo,
  type MimeAceito,
} from "@/lib/anexos";

import { caminhoRelativoSeguro } from "@/lib/anexos";

/**
 * Caminho RELATIVO à raiz de uploads, com separadores POSIX.
 *
 * Particionar por instalação e registro evita diretório com milhares de
 * arquivos, torna a inspeção manual no servidor viável e faz da exclusão de um
 * registro uma pasta.
 */
export function caminhoRelativoDe(
  instalacaoId: string,
  registroId: string,
  nomeArmazenado: string,
): string {
  return caminhoRelativoSeguro(
    ["instalacoes"],
    ["instalacaoId", instalacaoId],
    ["registros"],
    ["registroId", registroId],
    ["nomeArmazenado", nomeArmazenado],
  );
}

/** Diretório (relativo) que guarda os anexos de um registro. */
export function pastaRelativaDoRegistro(
  instalacaoId: string,
  registroId: string,
): string {
  return caminhoRelativoSeguro(
    ["instalacoes"],
    ["instalacaoId", instalacaoId],
    ["registros"],
    ["registroId", registroId],
  );
}
