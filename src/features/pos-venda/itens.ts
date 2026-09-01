/**
 * Itens do Pós-venda — REGRA PURA (Sprint 4.6).
 *
 * Duas responsabilidades, e nada mais:
 *
 * 1. **A regra XOR**: um item aponta para um Produto do cadastro **OU** carrega
 *    uma descrição manual. Nunca os dois vazios.
 * 2. **A aritmética do retorno**: quanto ainda falta voltar, por item e no
 *    total da Troca.
 *
 * Módulo PURO — sem banco, sem React, testado sem infraestrutura.
 *
 * ── POR QUE A ARITMÉTICA MORA AQUI ──────────────────────────────────────────
 * `quantidadePendenteRetorno` **não é coluna**. É `max(esperada - devolvida, 0)`
 * e nada mais. Persistir um valor calculável é criar uma segunda verdade: a
 * primeira vez que alguém atualizar `quantidadeDevolvida` sem recalcular o
 * pendente, a listagem passa a mentir e ninguém percebe. Mesmo princípio do
 * ADR-0219 (totais da proposta) e de `features/instalacoes/custos.ts`.
 *
 * O `max(..., 0)` não é defensivo por preguiça: o service recusa
 * `devolvida > esperada`, mas dados antigos, importação futura ou um `esperada`
 * reduzido depois de a devolução ter sido lançada produziriam negativo — e
 * "faltam -2 peças" não é informação que sirva a alguém.
 */

/** Item de Troca, na forma mínima que o cálculo precisa. */
export interface ItemRetornavel {
  quantidadeEsperadaRetorno: number;
  quantidadeDevolvida: number;
}

/** Quanto ainda falta voltar deste item. Nunca negativo. */
export function pendenteDoItem(item: ItemRetornavel): number {
  return Math.max(item.quantidadeEsperadaRetorno - item.quantidadeDevolvida, 0);
}

/**
 * Retorno consolidado da Troca: `devolvido / esperado`, somando todos os itens.
 *
 * É o que a coluna "Retorno" da listagem exibe (`0/1`, `5/7`, `7/7`). A soma é
 * feita sobre os itens, não sobre um contador guardado na Troca — de novo, uma
 * verdade só.
 */
export function retornoDaTroca(itens: ReadonlyArray<ItemRetornavel>): {
  devolvido: number;
  esperado: number;
  pendente: number;
} {
  const devolvido = itens.reduce((s, i) => s + i.quantidadeDevolvida, 0);
  const esperado = itens.reduce((s, i) => s + i.quantidadeEsperadaRetorno, 0);
  return { devolvido, esperado, pendente: Math.max(esperado - devolvido, 0) };
}

/** "5/7" — o texto exato da coluna Retorno. */
export function rotuloRetorno(itens: ReadonlyArray<ItemRetornavel>): string {
  const { devolvido, esperado } = retornoDaTroca(itens);
  return `${devolvido}/${esperado}`;
}

/**
 * `true` quando ainda falta algo voltar — o gatilho da confirmação forte na
 * finalização (spec §12).
 *
 * Uma Troca **sem itens** não tem pendência: não há nada esperado. Finalizar
 * uma Troca vazia é legítimo (o produto substituto foi enviado, o defeituoso
 * ficou com o cliente por acordo, e ninguém chegou a cadastrar item).
 */
export function temPendencia(itens: ReadonlyArray<ItemRetornavel>): boolean {
  return itens.some((i) => pendenteDoItem(i) > 0);
}

// ---------------------------------------------------------------------------
// Regra XOR — produto do cadastro OU descrição manual
// ---------------------------------------------------------------------------

/** Item na forma em que chega de um formulário. */
export interface ItemIdentificavel {
  produtoId: string | null;
  descricaoManual: string | null;
}

export const ITEM_SEM_IDENTIFICACAO =
  "Selecione um produto do cadastro ou informe a descrição manual.";

/**
 * `true` quando o item se identifica — tem produto do cadastro **ou** descrição
 * manual não vazia.
 *
 * Espaço em branco não conta como descrição: `"   "` é o mesmo que vazio, e
 * deixar passar produziria uma linha em branco na grade.
 */
export function itemIdentificado(item: ItemIdentificavel): boolean {
  const temProduto = Boolean(item.produtoId?.trim());
  const temDescricao = Boolean(item.descricaoManual?.trim());
  return temProduto || temDescricao;
}

/**
 * Texto do item na tela e na busca.
 *
 * O produto do cadastro vence quando existe — é a identificação forte. A
 * `descricaoManual` de um item que TAMBÉM tem produto (estado que a regra não
 * proíbe, apenas não incentiva) vira complemento, nunca desaparece: apagar
 * texto que o usuário digitou é pior do que exibir os dois.
 */
export function descricaoDoItem(item: {
  produtoCodigo?: string | null;
  produtoDescricao?: string | null;
  descricaoManual?: string | null;
}): string {
  const doCadastro = [item.produtoCodigo, item.produtoDescricao]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(" — ");
  const manual = item.descricaoManual?.trim() || "";

  if (doCadastro && manual) return `${doCadastro} (${manual})`;
  return doCadastro || manual || "—";
}

// ---------------------------------------------------------------------------
// Quantidades
// ---------------------------------------------------------------------------

/** Inteiro finito — rejeita `1.5`, `NaN` e `Infinity`. */
export function ehInteiro(valor: number): boolean {
  return Number.isInteger(valor);
}

export const QUANTIDADE_INVALIDA =
  "As quantidades devem ser números inteiros iguais ou maiores que zero.";
export const DEVOLVIDA_MAIOR_QUE_ESPERADA =
  "A quantidade devolvida não pode ser maior que a esperada para retorno.";

/**
 * Valida as três quantidades de um item de Troca. Devolve a mensagem de erro,
 * ou `null` quando válido.
 *
 * A ordem importa: "não é inteiro" é checado antes de "devolvida > esperada",
 * porque comparar valores que nem são inteiros produziria uma mensagem que não
 * ajuda a corrigir nada.
 *
 * **`quantidadeEnviada` não participa da comparação.** Enviado e esperado são
 * eixos independentes: dá para enviar 7 substitutos e esperar 7 de volta, mas
 * também dá para enviar 1 e esperar 0 (quando o defeituoso fica com o cliente).
 */
export function validarQuantidadesTroca(q: {
  quantidadeEnviada: number;
  quantidadeEsperadaRetorno: number;
  quantidadeDevolvida: number;
}): string | null {
  const todas = [
    q.quantidadeEnviada,
    q.quantidadeEsperadaRetorno,
    q.quantidadeDevolvida,
  ];
  if (todas.some((v) => !ehInteiro(v) || v < 0)) return QUANTIDADE_INVALIDA;
  if (q.quantidadeDevolvida > q.quantidadeEsperadaRetorno) {
    return DEVOLVIDA_MAIOR_QUE_ESPERADA;
  }
  return null;
}

export const QUANTIDADE_OS_INVALIDA =
  "A quantidade deve ser um número inteiro maior que zero.";

/**
 * Quantidade do item de OS: inteiro **estritamente** maior que zero.
 *
 * Diferente da Troca, onde zero é um estado real ("nada devolvido ainda"), um
 * item de OS com quantidade zero não é um item — é uma linha que não deveria
 * existir.
 */
export function validarQuantidadeOS(quantidade: number): string | null {
  return ehInteiro(quantidade) && quantidade > 0 ? null : QUANTIDADE_OS_INVALIDA;
}

// ---------------------------------------------------------------------------
// Troca → OS (criação semiautomática, spec §27)
// ---------------------------------------------------------------------------

/** Item de Troca na forma que a cópia para a OS precisa enxergar. */
export interface ItemCopiavel extends ItemIdentificavel, ItemRetornavel {}

/** Item já pronto para virar linha de OS. */
export interface ItemDeOSCopiado {
  produtoId: string | null;
  descricaoManual: string | null;
  quantidade: number;
}

export const NENHUM_ITEM_DEVOLVIDO =
  "Nenhum produto desta Troca foi devolvido ainda. " +
  "Registre as quantidades devolvidas antes de abrir a Ordem de Serviço.";

/**
 * Converte os itens da Troca nos itens da OS — o **snapshot** do ADR-0419.
 *
 * Regras, todas da spec §27:
 * - só entram itens com `quantidadeDevolvida > 0`;
 * - `quantidade` da OS **é** a `quantidadeDevolvida` daquele instante;
 * - `produtoId` do cadastro é preservado (é o que permite analisar defeito
 *   recorrente por produto depois);
 * - item manual carrega a `descricaoManual`.
 *
 * O resultado é copiado UMA vez, na criação. Não existe caminho de volta e não
 * existe código de sincronização — é por isso que o snapshot é seguro: não há o
 * que desligar depois. Alterar a Troca amanhã não tem por onde chegar à OS.
 *
 * Devolver lista vazia é um resultado legítimo desta função; quem decide o que
 * fazer com isso é o service (que recusa a criação com
 * {@link NENHUM_ITEM_DEVOLVIDO}).
 */
export function itensParaOS(
  itens: ReadonlyArray<ItemCopiavel>,
): ItemDeOSCopiado[] {
  return itens
    .filter((i) => i.quantidadeDevolvida > 0)
    .map((i) => ({
      produtoId: i.produtoId,
      descricaoManual: i.descricaoManual,
      quantidade: i.quantidadeDevolvida,
    }));
}
