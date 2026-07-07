# Design — Sprint 2.3: Serviços no Projeto de Automação

- **Data:** 2026-07-07
- **Status:** implementado (0.7.0).
- **Correção de rumo:** NÃO existe cadastro independente de Serviços. O **valor de
  serviço faz parte do cadastro do Produto**. Cada `Produto` tem `valorProduto` +
  `valorServico`; ao adicionar um produto na proposta, **ambos** são copiados para
  o item (snapshot) e ficam **editáveis apenas naquela proposta**.

## 1. Objetivo

Suportar corretamente o **valor de serviço** e os **cálculos por linha** no item
da proposta, evoluindo o modelo atual de Produtos — **sem** criar entidade,
tabela, CRUD, autocomplete ou módulo de Serviço.

## 2. Modelagem — SEM migração

O schema já suportava tudo:
- `Produto`: `valorProduto` + `valorServico`.
- `PropostaItem`: snapshot `valorProduto` + `valorServico` (+ codigo/descricao/
  unidade/quantidade). `tipo` permanece `PRODUTO` (SERVICO segue sem uso).

Nenhuma migração nesta Sprint (a modelagem de "Serviço separado" chegou a ser
esboçada e foi **revertida**; o banco de dev foi resetado ao estado das 4
migrations legítimas).

## 3. Regras / cálculos

- Ao adicionar produto: `valorProduto` e `valorServico` vêm do cadastro e são
  **editáveis** no diálogo. O snapshot guarda exatamente os valores usados; o
  cadastro do Produto **não** é alterado.
- Por linha (apenas visual):
  - **Total Produto** = Qtd × Valor Produto
  - **Total Serviço** = Qtd × Valor Serviço
  - **Total (da Linha)** = Total Produto + Total Serviço
- Fora de escopo (próximas Sprints): subtotal, total geral, desconto, frete,
  impostos, PDF.

## 4. UX — grade da linha

Colunas: **Código · Descrição · Qtd · UN · Valor Produto · Valor Serviço · Total
Produto · Total Serviço · Total · Ações**. Qtd, Valor Produto e Valor Serviço
editáveis inline (rascunho em memória; grava no "Salvar Alterações"/"Criar
Proposta", modelo 0.6.4). Comercial: itens nas seções; Simplificada: lista plana.

## 5. Componentes tocados (reuso, sem duplicação)

- `AdicionarItemDialog`: passa a ter dois campos de valor (Valor produto + Valor
  serviço), pré-preenchidos do cadastro e editáveis.
- `ItensTable`: novas colunas de valor/total (3 totais por linha).
- `ConteudoActions`/`useConteudoMemoria`: `adicionarItem`/`adicionarItemAvulso`
  carregam os dois valores; `atualizarValorProduto` + `atualizarValorServico`
  (substituem `atualizarValorUnitario`).
- `proposta.service` (`criarPropostaCompleta`/`salvarProposta`) + `schema`:
  payload do item = `{ produtoId, quantidade, valorProduto?, valorServico? }`
  (default do cadastro). Auditoria consolidada (0.6.4) — sem exceção.

## 6. ADRs

- **ADR-0215** — Serviço faz parte do cadastro do Produto (não é entidade
  independente); item snapshota `valorProduto` + `valorServico` editáveis;
  totais por linha (Produto/Serviço/Linha). Sem migração.
- **ADR-0217** — Enquadramento "Projeto de Automação" e forward-compatibility
  para Projeto de Som/Wi-Fi (documental; nada modelado). Ver §7.

## 7. Forward-compatibility (Projeto de Automação) — sem implementação

O conteúdo atual da proposta (Revisão → Seções → Itens) **é** o **Projeto de
Automação**. **Som** e **Wi-Fi** são módulos **futuros** e **NÃO** são modelados:
sem tabela `Projeto`, módulo, soluções, templates ou pacotes. A hierarquia
permite, no futuro, inserir uma camada "Projeto" de forma **aditiva** (Revisão →
Projetos → Seções → Itens) sem reescrever a arquitetura de itens — que já é
genérica. Nenhuma nomenclatura "automação" foi gravada em schema/código.

## 8. Critérios de aceite (atendidos)

1. Adicionar produto traz valorProduto + valorServico do cadastro, ambos
   editáveis; snapshot guarda os valores usados; cadastro intacto.
2. Grade mostra os dois valores + Total Produto + Total Serviço + Total (linha).
3. Salvar/criar/duplicar/fork preservam os dois valores; auditoria consolidada.
4. Gate verde: lint, typecheck, build, smoke, `/api/health`.
