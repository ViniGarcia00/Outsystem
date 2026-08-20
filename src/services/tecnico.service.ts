import { prisma } from "@/infrastructure/database";
import { CANNOT_DELETE_USED_IN_INSTALACOES } from "@/lib/messages";

/**
 * Serviço de Técnicos (Sprint 4.1, ADR-0408).
 *
 * Molde de `vendedor.service.ts`, com dois campos a menos. A diferença real
 * está na regra de exclusão: Técnico é usado em DOIS lugares — como responsável
 * atual da Instalação e como responsável de cada registro da cronologia —, e
 * ambos contam.
 *
 * Técnico NÃO é Vendedor e NÃO é Usuário. Não há login, permissão nem agenda.
 */

export interface TecnicoListItem {
  id: string;
  ativo: boolean;
  nome: string;
}

export interface TecnicoFormDTO {
  ativo: boolean;
  nome: string;
}

export interface TecnicoInput {
  ativo: boolean;
  nome: string;
}

/** Opção de `Select` — mesmo formato do `SelectOption` de `proposta.service`. */
export interface TecnicoOption {
  value: string;
  label: string;
}

export { CANNOT_DELETE_USED_IN_INSTALACOES };

export async function listTecnicos(
  showInactive: boolean,
): Promise<TecnicoListItem[]> {
  return prisma.tecnico.findMany({
    where: showInactive ? {} : { ativo: true },
    select: { id: true, ativo: true, nome: true },
    orderBy: { nome: "asc" },
  });
}

export async function getTecnicoForEdit(
  id: string,
): Promise<TecnicoFormDTO | null> {
  const t = await prisma.tecnico.findUnique({
    where: { id },
    select: { ativo: true, nome: true },
  });
  return t ?? null;
}

export async function createTecnico(input: TecnicoInput): Promise<string> {
  const created = await prisma.tecnico.create({
    data: { ativo: input.ativo, nome: input.nome.trim() },
    select: { id: true },
  });
  return created.id;
}

export async function updateTecnico(
  id: string,
  input: TecnicoInput,
): Promise<void> {
  await prisma.tecnico.update({
    where: { id },
    data: { ativo: input.ativo, nome: input.nome.trim() },
  });
}

/**
 * Exclusão permitida apenas para técnico NUNCA usado — o padrão de Cliente,
 * Produto e Vendedor. "Usado" é referenciado pela Instalação OU por qualquer
 * registro da cronologia.
 *
 * A checagem existe aqui mesmo com o `onDelete: Restrict` no banco: o Restrict
 * protege qualquer caminho de escrita, mas devolve erro de FK. É esta função que
 * produz a mensagem que orienta o usuário a inativar.
 */
export async function removeTecnico(id: string): Promise<void> {
  const [emInstalacoes, emRegistros] = await Promise.all([
    prisma.instalacao.count({ where: { tecnicoResponsavelId: id } }),
    prisma.instalacaoRegistro.count({ where: { tecnicoId: id } }),
  ]);
  if (emInstalacoes + emRegistros > 0) {
    throw new Error(CANNOT_DELETE_USED_IN_INSTALACOES);
  }
  await prisma.tecnico.delete({ where: { id } });
}

export async function setTecnicoAtivo(
  id: string,
  ativo: boolean,
): Promise<void> {
  await prisma.tecnico.update({ where: { id }, data: { ativo } });
}

/**
 * Opções para o `Select` de responsável: **ativos ∪ os ids informados**.
 *
 * `incluirIds` carrega os técnicos já vinculados àquele agregado, mesmo
 * inativos. Sem eles, abrir uma Instalação cujo técnico foi inativado mostraria
 * o campo em branco, e salvar qualquer outra alteração apagaria o vínculo em
 * silêncio. Inativo aparece rotulado, para não ser escolhido por engano em um
 * vínculo novo.
 */
export async function listTecnicoOptions(
  incluirIds: string[] = [],
): Promise<TecnicoOption[]> {
  const ids = [...new Set(incluirIds.filter(Boolean))];
  const rows = await prisma.tecnico.findMany({
    where: { OR: [{ ativo: true }, { id: { in: ids } }] },
    select: { id: true, nome: true, ativo: true },
    orderBy: { nome: "asc" },
  });
  return rows.map((t) => ({
    value: t.id,
    label: t.ativo ? t.nome : `${t.nome} (inativo)`,
  }));
}
