import { CANNOT_DELETE_USED_IN_PROPOSTAS } from "@/lib/messages";
import { prisma } from "@/infrastructure/database";

/**
 * Serviço de Clientes — orquestra o acesso ao banco (Prisma). A UI nunca acessa
 * o Prisma diretamente.
 *
 * Regra de exclusão: um cliente só pode ser excluído se nunca foi usado em uma
 * proposta (`Cliente.propostas`). Caso contrário, deve ser inativado.
 */

type TipoPessoa = "PF" | "PJ";

/** Item enxuto para a listagem (apenas os campos exibidos — performance). */
export interface ClienteListItem {
  id: string;
  ativo: boolean;
  tipoPessoa: TipoPessoa;
  nome: string | null;
  empresa: string | null;
  cpfCnpj: string | null;
  cidade: string | null;
  estado: string | null;
  telefone: string | null;
  email: string | null;
}

/** Valores do formulário de edição (strings prontas para o RHF). */
export interface ClienteFormDTO {
  ativo: boolean;
  tipoPessoa: TipoPessoa;
  nome: string;
  empresa: string;
  cpfCnpj: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  telefone: string;
  email: string;
  observacoes: string;
}

/** Dados de entrada para criar/atualizar. */
export interface ClienteInput {
  ativo: boolean;
  tipoPessoa: TipoPessoa;
  nome?: string;
  empresa?: string;
  cpfCnpj?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  telefone?: string;
  email?: string;
  observacoes?: string;
}

const trimOrNull = (value?: string): string | null =>
  value && value.trim() ? value.trim() : null;

function toData(input: ClienteInput) {
  return {
    ativo: input.ativo,
    tipoPessoa: input.tipoPessoa,
    // Persiste apenas o campo relevante ao tipo (evita "nome" órfão em PJ).
    nome: input.tipoPessoa === "PF" ? trimOrNull(input.nome) : null,
    empresa: input.tipoPessoa === "PJ" ? trimOrNull(input.empresa) : null,
    cpfCnpj: trimOrNull(input.cpfCnpj),
    cep: trimOrNull(input.cep),
    endereco: trimOrNull(input.endereco),
    numero: trimOrNull(input.numero),
    complemento: trimOrNull(input.complemento),
    bairro: trimOrNull(input.bairro),
    cidade: trimOrNull(input.cidade),
    estado: trimOrNull(input.estado),
    telefone: trimOrNull(input.telefone),
    email: trimOrNull(input.email),
    observacoes: trimOrNull(input.observacoes),
  };
}

/** Traduz erro de unicidade do cpfCnpj (P2002) em mensagem amigável. */
function mapWriteError(error: unknown): Error {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  ) {
    return new Error("Já existe um cliente com este CPF/CNPJ.");
  }
  return error instanceof Error ? error : new Error("Falha ao salvar o cliente.");
}

export async function listClientes(
  showInactive: boolean,
): Promise<ClienteListItem[]> {
  return prisma.cliente.findMany({
    where: showInactive ? {} : { ativo: true },
    select: {
      id: true,
      ativo: true,
      tipoPessoa: true,
      nome: true,
      empresa: true,
      cpfCnpj: true,
      cidade: true,
      estado: true,
      telefone: true,
      email: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Sugestão do autocomplete de clientes (proposta). */
export interface ClienteSuggestion {
  id: string;
  /** Nome (PF) ou razão social (PJ). */
  label: string;
  /** CPF/CNPJ, ou o tipo de pessoa quando não houver documento. */
  sublabel: string;
}

const SUGGESTION_SELECT = {
  id: true,
  tipoPessoa: true,
  nome: true,
  empresa: true,
  cpfCnpj: true,
} as const;

/** Menor quantidade de caracteres para disparar a busca do autocomplete. */
export const CLIENTE_SEARCH_MIN_CHARS = 3;

function toSuggestion(c: {
  id: string;
  tipoPessoa: TipoPessoa;
  nome: string | null;
  empresa: string | null;
  cpfCnpj: string | null;
}): ClienteSuggestion {
  const label =
    (c.tipoPessoa === "PJ" ? c.empresa || c.nome : c.nome || c.empresa) || "—";
  // Sub-rótulo = documento (CPF/CNPJ) para diferenciar clientes homônimos.
  const sublabel = c.cpfCnpj ?? "Sem documento";
  return { id: c.id, label, sublabel };
}

/**
 * Busca clientes ativos por Nome, Razão Social, CPF ou CNPJ para o autocomplete
 * da proposta. Só pesquisa a partir de {@link CLIENTE_SEARCH_MIN_CHARS} caracteres.
 * O documento é comparado ignorando a máscara (dígitos), então "52998224725"
 * casa com "529.982.247-25".
 */
export async function searchClientes(
  query: string,
): Promise<ClienteSuggestion[]> {
  const q = query.trim();
  if (q.length < CLIENTE_SEARCH_MIN_CHARS) return [];
  const digits = q.replace(/\D/g, "");

  // Busca textual no banco (nome, razão social e documento como digitado).
  const porTexto = await prisma.cliente.findMany({
    where: {
      ativo: true,
      OR: [
        { nome: { contains: q, mode: "insensitive" } },
        { empresa: { contains: q, mode: "insensitive" } },
        { cpfCnpj: { contains: q, mode: "insensitive" } },
      ],
    },
    select: SUGGESTION_SELECT,
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Busca por documento sem máscara: compara apenas os dígitos armazenados.
  // Limitada a 200 registros para não varrer toda a tabela por tecla digitada.
  let porDigitos: (typeof porTexto)[number][] = [];
  if (digits.length >= CLIENTE_SEARCH_MIN_CHARS) {
    const comDocumento = await prisma.cliente.findMany({
      where: { ativo: true, cpfCnpj: { not: null } },
      select: SUGGESTION_SELECT,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    porDigitos = comDocumento.filter((c) =>
      (c.cpfCnpj ?? "").replace(/\D/g, "").includes(digits),
    );
  }

  // Une os dois conjuntos, deduplica por id e limita a 10 sugestões.
  const porId = new Map<string, (typeof porTexto)[number]>();
  for (const c of [...porTexto, ...porDigitos]) porId.set(c.id, c);
  return [...porId.values()].slice(0, 10).map(toSuggestion);
}

export async function getClienteForEdit(
  id: string,
): Promise<ClienteFormDTO | null> {
  const c = await prisma.cliente.findUnique({ where: { id } });
  if (!c) return null;
  return {
    ativo: c.ativo,
    tipoPessoa: c.tipoPessoa,
    nome: c.nome ?? "",
    empresa: c.empresa ?? "",
    cpfCnpj: c.cpfCnpj ?? "",
    cep: c.cep ?? "",
    endereco: c.endereco ?? "",
    numero: c.numero ?? "",
    complemento: c.complemento ?? "",
    bairro: c.bairro ?? "",
    cidade: c.cidade ?? "",
    estado: c.estado ?? "",
    telefone: c.telefone ?? "",
    email: c.email ?? "",
    observacoes: c.observacoes ?? "",
  };
}

export async function createCliente(input: ClienteInput): Promise<string> {
  try {
    const created = await prisma.cliente.create({
      data: toData(input),
      select: { id: true },
    });
    return created.id;
  } catch (error) {
    throw mapWriteError(error);
  }
}

export async function updateCliente(
  id: string,
  input: ClienteInput,
): Promise<void> {
  try {
    await prisma.cliente.update({ where: { id }, data: toData(input) });
  } catch (error) {
    throw mapWriteError(error);
  }
}

export async function removeCliente(id: string): Promise<void> {
  const usadoEmPropostas = await prisma.proposta.count({
    where: { clienteId: id },
  });
  if (usadoEmPropostas > 0) {
    throw new Error(CANNOT_DELETE_USED_IN_PROPOSTAS);
  }
  await prisma.cliente.delete({ where: { id } });
}

export async function setClienteAtivo(
  id: string,
  ativo: boolean,
): Promise<void> {
  await prisma.cliente.update({ where: { id }, data: { ativo } });
}
