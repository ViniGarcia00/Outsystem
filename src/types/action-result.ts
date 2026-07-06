/**
 * Resultado padronizado para operações que podem falhar (ex.: Server Actions
 * e chamadas de service nas próximas Sprints). Uniformiza o tratamento de
 * sucesso/erro na fronteira entre UI e camada de aplicação.
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function fail(error: string): ActionResult<never> {
  return { success: false, error };
}
