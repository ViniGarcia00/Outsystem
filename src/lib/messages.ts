/** Mensagens de domínio reutilizadas entre camadas. */

/** Exclusão bloqueada quando o registro já foi usado em propostas. */
export const CANNOT_DELETE_USED_IN_PROPOSTAS =
  "Este registro já foi utilizado em propostas e não pode ser excluído. Utilize a opção Inativar.";

/**
 * Exclusão bloqueada quando o usuário já foi usado em qualquer vínculo.
 *
 * Substitui as duas mensagens anteriores, uma por cadastro (Sprint 4.2,
 * ADR-0410): com identidade única, a mesma pessoa pode ter sido usada como
 * vendedora, como técnica ou como as duas, e a orientação é sempre a mesma.
 */
export const CANNOT_DELETE_USED_IN_RECORDS =
  "Este usuário já foi utilizado em propostas ou instalações e não pode ser excluído. Utilize a opção Inativar.";

/**
 * Registro da cronologia inalcançável — inexistente OU fora da instalação
 * informada. A mensagem é a MESMA nos dois casos de propósito: não vazar a
 * diferença é parte da garantia do agregado (ADR-0409).
 *
 * Mora aqui, e não no service da cronologia, porque o service de ANEXOS também
 * precisa dela: mantê-la lá obrigaria anexo -> registro no runtime, e a T21
 * introduziu registro -> anexo. Uma constante compartilhada desfaz o ciclo sem
 * duplicar texto de usuário.
 */
export const REGISTRO_NAO_ENCONTRADO = "Registro não encontrado.";
