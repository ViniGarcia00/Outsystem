import { describe, expect, it } from "vitest";

import { mainNavigation } from "./navigation";

/**
 * A ordem do menu é requisito de produto (Sprint 4.0.3, revista na 4.2), não
 * detalhe estético. Sem este teste, um item acrescentado no fim do array
 * passaria despercebido.
 */
const ORDEM_ESPERADA = [
  "Dashboard",
  "Clientes",
  "Produtos",
  "Propostas",
  "Instalações",
  "Usuários",
  "Configurações",
];

describe("mainNavigation", () => {
  it("mantém exatamente a ordem definida na Sprint 4.2", () => {
    expect(mainNavigation.map((i) => i.title)).toEqual(ORDEM_ESPERADA);
  });

  it("tem exatamente sete itens — Vendedores e Técnicos viraram Usuários", () => {
    expect(mainNavigation).toHaveLength(7);
  });

  it("preserva as rotas de cada item", () => {
    expect(
      Object.fromEntries(mainNavigation.map((i) => [i.title, i.href])),
    ).toEqual({
      Dashboard: "/dashboard",
      Clientes: "/clientes",
      Produtos: "/produtos",
      Propostas: "/propostas",
      Instalações: "/instalacoes",
      Usuários: "/usuarios",
      Configurações: "/configuracoes",
    });
  });

  // Sem redirects: as rotas antigas deixaram de existir por decisão (ADR-0410).
  // Se alguém as reintroduzir no menu, este teste avisa.
  it("não expõe mais as rotas dos cadastros removidos", () => {
    const hrefs = mainNavigation.map((i) => i.href);
    expect(hrefs).not.toContain("/vendedores");
    expect(hrefs).not.toContain("/tecnicos");
  });

  it("todo item tem ícone", () => {
    for (const item of mainNavigation) {
      expect(item.icon, `"${item.title}" sem ícone`).toBeDefined();
    }
  });
});
