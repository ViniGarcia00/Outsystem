import { CANNOT_DELETE_USED_IN_PROPOSTAS } from "@/lib/messages";
import { prisma } from "@/infrastructure/database";
import { contemBusca } from "@/utils";

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
  rg: string;
  inscricaoEstadual: string;
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
  rg?: string;
  inscricaoEstadual?: string;
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
    // RG só para PF; Inscrição Estadual só para PJ (evita campo órfão).
    rg: input.tipoPessoa === "PF" ? trimOrNull(input.rg) : null,
    inscricaoEstadual:
      input.tipoPessoa === "PJ" ? trimOrNull(input.inscricaoEstadual) : null,
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
 *
 * **O filtro textual acontece em memória, não no banco (Sprint 4.0.3, ADR-0402).**
 * O `contains + mode: "insensitive"` do Prisma vira `ILIKE` no PostgreSQL:
 * insensível a caixa, mas SENSÍVEL a acento — `ILIKE '%thai%'` não encontrava
 * "Thaís". Resolver no banco exigiria `unaccent`, e `CREATE EXTENSION` pede
 * superusuário, contra o ADR-0101 (a aplicação usa o usuário dedicado `outmat`).
 *
 * O conjunto é carregado SEM `take`, de propósito: um limite antes do filtro
 * deixaria de fora um cliente válido que estivesse além do corte — exatamente a
 * falha que esta correção existe para eliminar. Só os cinco campos da sugestão
 * são selecionados, e o corte de 10 é aplicado depois de filtrar. Para volume
 * muito maior, ver o item de busca server-side escalável no BACKLOG.
 */
export async function searchClientes(
  query: string,
): Promise<ClienteSuggestion[]> {
  const q = query.trim();
  if (q.length < CLIENTE_SEARCH_MIN_CHARS) return [];
  const digits = q.replace(/\D/g, "");
  const buscaPorDigitos = digits.length >= CLIENTE_SEARCH_MIN_CHARS;

  const ativos = await prisma.cliente.findMany({
    where: { ativo: true },
    select: SUGGESTION_SELECT,
    orderBy: { createdAt: "desc" },
  });

  // Um único passe: texto normalizado (nome, razão social, documento como
  // digitado) OU documento comparado só pelos dígitos. Com o conjunto inteiro em
  // memória, o caminho por dígitos deixou de precisar da segunda consulta.
  const encontrados = ativos.filter((c) => {
    const porTexto =
      contemBusca(c.nome ?? "", q) ||
      contemBusca(c.empresa ?? "", q) ||
      contemBusca(c.cpfCnpj ?? "", q);
    if (porTexto) return true;

    return (
      buscaPorDigitos && (c.cpfCnpj ?? "").replace(/\D/g, "").includes(digits)
    );
  });

  return encontrados.slice(0, 10).map(toSuggestion);
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
    rg: c.rg ?? "",
    inscricaoEstadual: c.inscricaoEstadual ?? "",
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

/**
 * Endereço do Cliente para PRÉ-VISUALIZAÇÃO na tela de Instalações
 * (Sprint 4.0.1).
 *
 * ATENÇÃO: isto NÃO é a fonte do snapshot. O que é gravado vem de
 * `criarInstalacao`, que lê o Cliente na própria transação (ADR-0400). Esta
 * função existe só para o usuário conferir, antes de salvar, qual endereço será
 * copiado.
 */
export async function getClienteEnderecoSnapshot(id: string) {
  return prisma.cliente.findUnique({
    where: { id },
    select: {
      cep: true,
      endereco: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      estado: true,
    },
  });
}
