export {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatCpfCnpj,
  formatPhone,
  onlyDigits,
  type DateInput,
} from "./format";

export { isValidCpf, isValidCnpj, isValidCpfCnpj } from "./validation";

/** Normalização de busca — fonte única do sistema (ADR-0402). */
export { normalizarBusca, contemBusca } from "./busca";
