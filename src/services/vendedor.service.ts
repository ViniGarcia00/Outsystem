import { CANNOT_DELETE_USED_IN_PROPOSTAS } from "@/lib/messages";
import { prisma } from "@/infrastructure/database";

/**
 * Serviço de Vendedores.
 *
 * Regra de exclusão: um vendedor só pode ser excluído se nunca foi usado em uma
 * proposta (`Proposta.vendedorId`). Caso contrário, deve ser inativado.
 */

export interface VendedorListItem {
  id: string;
  ativo: boolean;
  nome: string;
  telefone: string | null;
  email: string | null;
}

export interface VendedorFormDTO {
  ativo: boolean;
  nome: string;
  telefone: string;
  email: string;
}

export interface VendedorInput {
  ativo: boolean;
  nome: string;
  telefone?: string;
  email?: string;
}

const trimOrNull = (value?: string): string | null =>
  value && value.trim() ? value.trim() : null;

function toData(input: VendedorInput) {
  return {
    ativo: input.ativo,
    nome: input.nome.trim(),
    telefone: trimOrNull(input.telefone),
    email: trimOrNull(input.email),
  };
}

export async function listVendedores(
  showInactive: boolean,
): Promise<VendedorListItem[]> {
  return prisma.vendedor.findMany({
    where: showInactive ? {} : { ativo: true },
    select: {
      id: true,
      ativo: true,
      nome: true,
      telefone: true,
      email: true,
    },
    orderBy: { nome: "asc" },
  });
}

export async function getVendedorForEdit(
  id: string,
): Promise<VendedorFormDTO | null> {
  const v = await prisma.vendedor.findUnique({ where: { id } });
  if (!v) return null;
  return {
    ativo: v.ativo,
    nome: v.nome,
    telefone: v.telefone ?? "",
    email: v.email ?? "",
  };
}

export async function createVendedor(input: VendedorInput): Promise<string> {
  const created = await prisma.vendedor.create({
    data: toData(input),
    select: { id: true },
  });
  return created.id;
}

export async function updateVendedor(
  id: string,
  input: VendedorInput,
): Promise<void> {
  await prisma.vendedor.update({ where: { id }, data: toData(input) });
}

export async function removeVendedor(id: string): Promise<void> {
  const usadoEmPropostas = await prisma.proposta.count({
    where: { vendedorId: id },
  });
  if (usadoEmPropostas > 0) {
    throw new Error(CANNOT_DELETE_USED_IN_PROPOSTAS);
  }
  await prisma.vendedor.delete({ where: { id } });
}

export async function setVendedorAtivo(
  id: string,
  ativo: boolean,
): Promise<void> {
  await prisma.vendedor.update({ where: { id }, data: { ativo } });
}
