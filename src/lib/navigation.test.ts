import { describe, expect, it } from "vitest";

import { mainNavigation } from "./navigation";

/**
 * A ordem do menu é requisito de produto (Sprint 4.0.3), não detalhe estético.
 * Sem este teste, um item acrescentado no fim do array passaria despercebido.
 */
const ORDEM_ESPERADA = [
  "Dashboard",
  "Clientes",
  "Produtos",
  "Propostas",
  "Instalações",
  "Vendedores",
  "Técnicos",
  "Configurações",
];

describe("mainNavigation", () => {
  it("mantém exatamente a ordem definida na Sprint 4.0.3", () => {
    expect(mainNavigation.map((i) => i.title)).toEqual(ORDEM_ESPERADA);
  });

  it("tem exatamente oito itens — nenhum grupo ou submenu novo", () => {
    expect(mainNavigation).toHaveLength(8);
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
      Vendedores: "/vendedores",
      Técnicos: "/tecnicos",
      Configurações: "/configuracoes",
    });
  });

  it("todo item tem ícone", () => {
    for (const item of mainNavigation) {
      expect(item.icon, `"${item.title}" sem ícone`).toBeDefined();
    }
  });
});
