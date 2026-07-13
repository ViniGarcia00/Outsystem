import { describe, expect, it } from "vitest";

import { reordenarNaLista } from "./conteudo-memoria";

/** Lista mínima no formato { id, ordem } usado pela reordenação. */
const lista = () => [
  { id: "a", ordem: 0 },
  { id: "b", ordem: 1 },
  { id: "c", ordem: 2 },
  { id: "d", ordem: 3 },
];

describe("reordenarNaLista (Drag & Drop)", () => {
  it("move um item para BAIXO até a posição do destino e renumera ordem", () => {
    // Arrasta "a" (índice 0) sobre "c" (índice 2).
    const r = reordenarNaLista(lista(), "a", "c");
    expect(r.map((x) => x.id)).toEqual(["b", "c", "a", "d"]);
    expect(r.map((x) => x.ordem)).toEqual([0, 1, 2, 3]);
  });

  it("move um item para CIMA até a posição do destino", () => {
    // Arrasta "d" (índice 3) sobre "b" (índice 1).
    const r = reordenarNaLista(lista(), "d", "b");
    expect(r.map((x) => x.id)).toEqual(["a", "d", "b", "c"]);
    expect(r.map((x) => x.ordem)).toEqual([0, 1, 2, 3]);
  });

  it("é no-op quando origem e destino são o mesmo item", () => {
    const original = lista();
    expect(reordenarNaLista(original, "b", "b")).toBe(original);
  });

  it("é no-op quando algum id não existe", () => {
    const original = lista();
    expect(reordenarNaLista(original, "a", "z")).toBe(original);
    expect(reordenarNaLista(original, "z", "a")).toBe(original);
  });
});
