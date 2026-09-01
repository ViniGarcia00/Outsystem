/**
 * Papéis do Usuário — REGRA PURA (Sprint 4.2, ADR-0410).
 *
 * Decide quem pode ser escolhido em cada papel e como quem já está vinculado,
 * mas não pode mais ser escolhido, aparece na lista.
 *
 * `ativo` e papel são eixos INDEPENDENTES. Há duas formas de ficar indisponível
 * — inativado, ou papel desmarcado — e o efeito operacional é o mesmo: some das
 * escolhas novas. O que difere é o rótulo, porque as duas situações pedem ações
 * diferentes de quem administra o cadastro.
 *
 * Módulo PURO — sem Prisma, sem IO, sem React. Mesmo par service/módulo-puro de
 * `dashboard.service` ↔ `features/dashboard/dashboard.ts`.
 */

export type PapelUsuario = "ehVendedor" | "ehTecnico";

export interface UsuarioComPapeis {
  nome: string;
  ativo: boolean;
  ehVendedor: boolean;
  ehTecnico: boolean;
}

/** Nome do papel em português, para mensagens e rótulos. */
export const LABEL_PAPEL: Record<PapelUsuario, string> = {
  ehVendedor: "vendedor",
  ehTecnico: "técnico",
};

/** Pode ser escolhido para um vínculo NOVO neste papel. */
export function disponivelPara(
  u: UsuarioComPapeis,
  papel: PapelUsuario,
): boolean {
  return u.ativo && u[papel];
}

/**
 * Rótulo da opção no Select.
 *
 * Um único sufixo, nunca dois: quando a pessoa está inativa **e** sem o papel,
 * vence "(inativo)" — é a condição mais forte e é o rótulo que já existia no
 * cadastro de Técnicos (ADR-0408), preservado aqui.
 */
export function rotuloOpcao(u: UsuarioComPapeis, papel: PapelUsuario): string {
  if (!u.ativo) return `${u.nome} (inativo)`;
  if (!u[papel]) return `${u.nome} (sem papel de ${LABEL_PAPEL[papel]})`;
  return u.nome;
}

// ---------------------------------------------------------------------------
// Vínculo SEM exigência de papel (Sprint 4.6)
// ---------------------------------------------------------------------------
//
// Nem todo vínculo operacional é técnico. A **Troca Antecipada** é acompanhada
// por quem cuida de envio, devolução, frete e cobrança — trabalho
// administrativo —, e exigir `ehTecnico` ali limitaria o cadastro sem nenhuma
// razão de negócio (ADR-0422).
//
// As duas funções abaixo são o par exato de `disponivelPara`/`rotuloOpcao` para
// esse caso: mesma semântica, um eixo a menos. **Nenhuma delas altera as
// existentes** — Proposta (vendedor), Instalação (técnico) e Ordem de Serviço
// (técnico) continuam com a regra de papel intacta.

/**
 * Pode ser escolhido para um vínculo NOVO que não exige papel.
 *
 * Só `ativo`. Um usuário sem papel nenhum é escolhível aqui, e isso é
 * deliberado: "sem papel" significa que a função ainda não foi decidida
 * (ADR-0410), não que a pessoa não trabalhe.
 */
export function disponivelAtivo(u: Pick<UsuarioComPapeis, "ativo">): boolean {
  return u.ativo;
}

/**
 * Rótulo da opção quando o papel não é exigido.
 *
 * Só existe UM sufixo possível, porque só existe uma forma de ficar
 * indisponível: inativado. Não há "(sem papel de …)" aqui — seria informação
 * sobre um requisito que este vínculo não tem.
 */
export function rotuloOpcaoAtivo(
  u: Pick<UsuarioComPapeis, "nome" | "ativo">,
): string {
  return u.ativo ? u.nome : `${u.nome} (inativo)`;
}
