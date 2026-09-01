/**
 * Anexos do Pós-venda (Sprint 4.6) — construtores de caminho.
 *
 * A allowlist de MIME, os limites, a validação, o nome físico, a sanitização e
 * a regra de segmento vêm de `@/lib/anexos`, fonte única do sistema
 * (ADR-0421). **Nenhuma dessas regras é reescrita aqui**: reescrever a
 * allowlist é o defeito que o ADR-0402 corrigiu na busca, e um arquivo aceito
 * nas Instalações e recusado no Pós-venda seria a mesma classe de erro.
 *
 * O que é PRÓPRIO deste módulo é o particionamento em disco. Troca e OS têm
 * pastas separadas, sob um prefixo comum:
 *
 *   pos-venda/trocas/<trocaId>/registros/<registroId>/<chave>.<ext>
 *   pos-venda/ordens-servico/<osId>/registros/<registroId>/<chave>.<ext>
 *
 * O prefixo `pos-venda/` existe para que a limpeza E2E e a inspeção manual no
 * servidor tenham uma raiz só do módulo, sem esbarrar em `instalacoes/`.
 *
 * Módulo PURO — sem IO. Todo acesso a disco continua passando por
 * `resolveWithin` nos services, que é a guarda final.
 */

import { caminhoRelativoSeguro } from "@/lib/anexos";

export {
  ACCEPT_ANEXO,
  ANEXO_LIMITE_EXCEDIDO,
  ANEXO_MAXIMO_ATINGIDO,
  ANEXO_NAO_ENCONTRADO,
  ANEXO_TIPO_RECUSADO,
  ANEXO_VAZIO,
  MAX_BYTES,
  MAX_POR_REGISTRO,
  MIME_ACEITOS,
  MIMES_INLINE,
  extensaoDe,
  formatarTamanho,
  nomeFisico,
  sanitizarNomeOriginal,
  validarArquivo,
} from "@/lib/anexos";

/**
 * Qual submódulo guarda o arquivo. É o único eixo em que os dois caminhos
 * diferem — daí um parâmetro em vez de duas famílias de função.
 */
export type AgregadoPosVenda = "TROCA" | "OS";

/** Pasta raiz de cada submódulo, sob a raiz de uploads. */
const PASTA: Record<AgregadoPosVenda, string> = {
  TROCA: "trocas",
  OS: "ordens-servico",
};

/** Prefixo comum — a raiz do módulo em disco. */
export const RAIZ_POS_VENDA = "pos-venda";

/**
 * Caminho RELATIVO à raiz de uploads, com separadores POSIX.
 *
 * Particionar por agregado e registro evita diretório com milhares de arquivos,
 * torna a inspeção manual no servidor viável e faz da exclusão de um registro
 * uma pasta.
 */
export function caminhoRelativoDe(
  agregado: AgregadoPosVenda,
  agregadoId: string,
  registroId: string,
  nomeArmazenado: string,
): string {
  return caminhoRelativoSeguro(
    [RAIZ_POS_VENDA],
    [PASTA[agregado]],
    ["agregadoId", agregadoId],
    ["registros"],
    ["registroId", registroId],
    ["nomeArmazenado", nomeArmazenado],
  );
}

/** Diretório (relativo) que guarda os anexos de um registro. */
export function pastaRelativaDoRegistro(
  agregado: AgregadoPosVenda,
  agregadoId: string,
  registroId: string,
): string {
  return caminhoRelativoSeguro(
    [RAIZ_POS_VENDA],
    [PASTA[agregado]],
    ["agregadoId", agregadoId],
    ["registros"],
    ["registroId", registroId],
  );
}

/**
 * Diretório (relativo) de um agregado inteiro — todas as pastas de registro.
 *
 * Usado pela limpeza E2E. A aplicação não apaga Troca nem OS (elas são
 * canceladas, nunca excluídas), então não há caminho de produção que remova
 * esta pasta.
 */
export function pastaRelativaDoAgregado(
  agregado: AgregadoPosVenda,
  agregadoId: string,
): string {
  return caminhoRelativoSeguro(
    [RAIZ_POS_VENDA],
    [PASTA[agregado]],
    ["agregadoId", agregadoId],
  );
}
