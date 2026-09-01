import {
  disponivelAtivo,
  disponivelPara,
  LABEL_PAPEL,
  rotuloOpcao,
  rotuloOpcaoAtivo,
  type PapelUsuario,
} from "@/features/usuarios/opcoes";
import { prisma } from "@/infrastructure/database";
import { CANNOT_DELETE_USED_IN_RECORDS } from "@/lib/messages";

/**
 * Serviço de Usuários (Sprint 4.2, ADR-0410).
 *
 * Substitui `vendedor.service.ts` e `tecnico.service.ts`. Só IO: a regra de
 * papel/disponibilidade/rótulo mora em `features/usuarios/opcoes.ts`, módulo
 * puro testado sem banco — mesmo par service/módulo de `dashboard.service`.
 *
 * **Usuario não é principal de autenticação.** Sem login, senha ou permissão.
 * Estes vínculos respondem QUEM FEZ o trabalho, não quem operou o sistema.
 */

export type { PapelUsuario };

export interface UsuarioListItem {
  id: string;
  ativo: boolean;
  nome: string;
  ehVendedor: boolean;
  ehTecnico: boolean;
  telefone: string | null;
  email: string | null;
}

export interface UsuarioFormDTO {
  ativo: boolean;
  nome: string;
  ehVendedor: boolean;
  ehTecnico: boolean;
  telefone: string;
  email: string;
}

export interface UsuarioInput {
  ativo: boolean;
  nome: string;
  ehVendedor: boolean;
  ehTecnico: boolean;
  telefone?: string;
  email?: string;
}

/** Opção de `Select` — mesmo formato do `SelectOption` de `proposta.service`. */
export interface UsuarioOption {
  value: string;
  label: string;
}

export const USUARIO_NAO_ENCONTRADO = "Usuário não encontrado.";

/** Mensagem do papel exigido e ausente. */
export const semPapelMsg = (papel: PapelUsuario): string =>
  `O usuário selecionado não tem o papel de ${LABEL_PAPEL[papel]}.`;

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const trimOrNull = (value?: string): string | null =>
  value && value.trim() ? value.trim() : null;

function toData(input: UsuarioInput) {
  return {
    ativo: input.ativo,
    nome: input.nome.trim(),
    ehVendedor: input.ehVendedor,
    ehTecnico: input.ehTecnico,
    telefone: trimOrNull(input.telefone),
    email: trimOrNull(input.email),
  };
}

const SELECT_LIST = {
  id: true,
  ativo: true,
  nome: true,
  ehVendedor: true,
  ehTecnico: true,
  telefone: true,
  email: true,
} as const;

export async function listUsuarios(
  showInactive: boolean,
): Promise<UsuarioListItem[]> {
  return prisma.usuario.findMany({
    where: showInactive ? {} : { ativo: true },
    select: SELECT_LIST,
    orderBy: { nome: "asc" },
  });
}

export async function getUsuarioForEdit(
  id: string,
): Promise<UsuarioFormDTO | null> {
  const u = await prisma.usuario.findUnique({ where: { id } });
  if (!u) return null;
  return {
    ativo: u.ativo,
    nome: u.nome,
    ehVendedor: u.ehVendedor,
    ehTecnico: u.ehTecnico,
    telefone: u.telefone ?? "",
    email: u.email ?? "",
  };
}

export async function createUsuario(input: UsuarioInput): Promise<string> {
  const created = await prisma.usuario.create({
    data: toData(input),
    select: { id: true },
  });
  return created.id;
}

export async function updateUsuario(
  id: string,
  input: UsuarioInput,
): Promise<void> {
  await prisma.usuario.update({ where: { id }, data: toData(input) });
}

/**
 * Exclusão permitida apenas para usuário NUNCA usado — o padrão de Cliente,
 * Produto, Vendedor e Técnico. "Usado" são SETE relações desde a Sprint 4.6,
 * porque a mesma identidade pode ter atuado em vários papéis e módulos.
 *
 * A checagem existe aqui mesmo com o `onDelete: Restrict` no banco: o Restrict
 * protege qualquer caminho de escrita, mas devolve erro de FK. É esta função
 * que produz a mensagem que orienta o usuário a inativar.
 *
 * **Toda relação NOVA com `Usuario` precisa entrar nesta lista.** Esquecer uma
 * não abre brecha de integridade — o Restrict continua barrando —, mas troca
 * uma orientação clara por um erro cru de banco na tela.
 */
export async function removeUsuario(id: string): Promise<void> {
  const usos = await Promise.all([
    prisma.proposta.count({ where: { vendedorId: id } }),
    prisma.instalacao.count({ where: { tecnicoResponsavelId: id } }),
    prisma.instalacaoRegistro.count({ where: { tecnicoId: id } }),
    // Pós-venda (Sprint 4.6): responsável e autor de registro, nos dois
    // submódulos. Todos RESTRICT, como os três acima.
    prisma.trocaAntecipada.count({ where: { responsavelId: id } }),
    prisma.trocaAntecipadaRegistro.count({ where: { responsavelId: id } }),
    prisma.ordemServicoPosVenda.count({ where: { responsavelId: id } }),
    prisma.ordemServicoPosVendaRegistro.count({ where: { responsavelId: id } }),
  ]);
  if (usos.reduce((soma, n) => soma + n, 0) > 0) {
    throw new Error(CANNOT_DELETE_USED_IN_RECORDS);
  }
  await prisma.usuario.delete({ where: { id } });
}

export async function setUsuarioAtivo(
  id: string,
  ativo: boolean,
): Promise<void> {
  await prisma.usuario.update({ where: { id }, data: { ativo } });
}

/**
 * Opções do `Select` de um papel: **disponíveis ∪ os ids informados**.
 *
 * `incluirIds` carrega os usuários já vinculados àquele agregado, mesmo
 * indisponíveis. Sem eles, abrir uma proposta cujo vendedor foi inativado (ou
 * perdeu o papel) mostraria o campo em branco, e salvar qualquer outra
 * alteração apagaria o vínculo em silêncio. Indisponível aparece rotulado, para
 * não ser escolhido por engano em um vínculo novo.
 */
export async function listUsuarioOptions(
  papel: PapelUsuario,
  incluirIds: string[] = [],
): Promise<UsuarioOption[]> {
  const ids = [...new Set(incluirIds.filter(Boolean))];
  const rows = await prisma.usuario.findMany({
    where: { OR: [{ ativo: true, [papel]: true }, { id: { in: ids } }] },
    select: {
      id: true,
      nome: true,
      ativo: true,
      ehVendedor: true,
      ehTecnico: true,
    },
    orderBy: { nome: "asc" },
  });
  return rows.map((u) => ({ value: u.id, label: rotuloOpcao(u, papel) }));
}

/**
 * Exige que `usuarioId` esteja DISPONÍVEL para `papel` — ativo e com o papel.
 *
 * Recebe o `tx` de quem chama para rodar DENTRO da mesma transação: a
 * verificação e a escrita precisam enxergar o mesmo estado. É a mesma razão
 * pela qual `nomeDoTecnico` lê o cadastro dentro da transação (ADR-0408): uma
 * garantia de integridade não pode depender do estado de um formulário nem de
 * uma leitura feita antes.
 *
 * Chamada APENAS para vínculo novo ou alterado — nunca para vínculo
 * preexistente inalterado. Ver os comentários nos services consumidores.
 */
export async function assertPapel(
  tx: Tx,
  usuarioId: string,
  papel: PapelUsuario,
): Promise<void> {
  const u = await tx.usuario.findUnique({
    where: { id: usuarioId },
    select: { nome: true, ativo: true, ehVendedor: true, ehTecnico: true },
  });
  if (!u) throw new Error(USUARIO_NAO_ENCONTRADO);
  if (!disponivelPara(u, papel)) throw new Error(semPapelMsg(papel));
}

// ---------------------------------------------------------------------------
// Vínculo SEM exigência de papel (Sprint 4.6, ADR-0422)
// ---------------------------------------------------------------------------
//
// Irmãs aditivas das duas funções acima, para vínculos em que **qualquer
// usuário ativo** serve — hoje, a Troca Antecipada e a timeline dela. Nenhuma
// substitui as anteriores: Proposta, Instalação e Ordem de Serviço continuam
// exigindo papel, com o mesmo código de antes.

export const USUARIO_INATIVO =
  "O usuário selecionado está inativo e não pode receber vínculos novos.";

/**
 * Opções do `Select` quando o papel NÃO é exigido: **ativos ∪ os ids
 * informados**.
 *
 * `incluirIds` carrega quem já está vinculado àquele agregado, mesmo inativo.
 * Sem eles, abrir uma troca cujo responsável foi inativado mostraria o campo em
 * branco, e salvar qualquer outra alteração apagaria o vínculo em silêncio —
 * exatamente a razão pela qual `listUsuarioOptions` faz o mesmo. Inativo
 * aparece rotulado, para não ser escolhido por engano num vínculo novo.
 */
export async function listUsuarioOptionsAtivos(
  incluirIds: string[] = [],
): Promise<UsuarioOption[]> {
  const ids = [...new Set(incluirIds.filter(Boolean))];
  const rows = await prisma.usuario.findMany({
    where: { OR: [{ ativo: true }, { id: { in: ids } }] },
    select: { id: true, nome: true, ativo: true },
    orderBy: { nome: "asc" },
  });
  return rows.map((u) => ({ value: u.id, label: rotuloOpcaoAtivo(u) }));
}

/**
 * Exige que `usuarioId` esteja ATIVO. Sem exigência de papel.
 *
 * Recebe o `tx` de quem chama para rodar DENTRO da mesma transação: a
 * verificação e a escrita precisam enxergar o mesmo estado — mesma razão de
 * `assertPapel`.
 *
 * Chamada APENAS para vínculo novo ou alterado, nunca para vínculo preexistente
 * inalterado. É isso que permite editar uma troca cujo responsável foi
 * inativado sem perder o vínculo histórico.
 */
export async function assertUsuarioAtivo(
  tx: Tx,
  usuarioId: string,
): Promise<void> {
  const u = await tx.usuario.findUnique({
    where: { id: usuarioId },
    select: { ativo: true },
  });
  if (!u) throw new Error(USUARIO_NAO_ENCONTRADO);
  if (!disponivelAtivo(u)) throw new Error(USUARIO_INATIVO);
}
