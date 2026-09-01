import { describe, expect, it } from "vitest";

import { mainNavigation } from "./navigation";

/**
 * A ordem do menu é requisito de produto (Sprint 4.0.3, revista na 4.2 e na
 * 4.6), não detalhe estético. Sem este teste, um item acrescentado no fim do
 * array passaria despercebido.
 */
const ORDEM_ESPERADA = [
  "Dashboard",
  "Clientes",
  "Produtos",
  "Propostas",
  "Instalações",
  "Pós-venda",
  "Usuários",
  "Configurações",
];

describe("mainNavigation", () => {
  it("mantém exatamente a ordem definida na Sprint 4.6", () => {
    expect(mainNavigation.map((i) => i.title)).toEqual(ORDEM_ESPERADA);
  });

  it("tem exatamente oito itens — Pós-venda entrou na Sprint 4.6", () => {
    expect(mainNavigation).toHaveLength(8);
  });

  /**
   * Pós-venda vem DEPOIS de Instalações: é o que acontece *depois* da
   * instalação, e a vizinhança dos dois itens operacionais é deliberada.
   */
  it("posiciona Pós-venda logo após Instalações", () => {
    const titulos = mainNavigation.map((i) => i.title);
    expect(titulos.indexOf("Pós-venda")).toBe(
      titulos.indexOf("Instalações") + 1,
    );
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
      "Pós-venda": "/pos-venda",
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

  /**
   * Os submódulos do Pós-venda vivem no HUB, não no menu (Sprint 4.6). Promover
   * um deles à barra lateral desfaria a decisão sem que ninguém percebesse.
   */
  it("não expõe os submódulos de Pós-venda direto no menu", () => {
    const hrefs = mainNavigation.map((i) => i.href);
    expect(hrefs).not.toContain("/pos-venda/trocas-antecipadas");
    expect(hrefs).not.toContain("/pos-venda/ordens-de-servico");
  });

  it("todo item tem ícone", () => {
    for (const item of mainNavigation) {
      expect(item.icon, `"${item.title}" sem ícone`).toBeDefined();
    }
  });
});
