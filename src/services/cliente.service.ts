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
    nome: trimOrNull(input.nome),
    empresa: trimOrNull(input.empresa),
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
