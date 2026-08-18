# VISION.md — Regras de negócio

> Fonte de verdade das regras de negócio do sistema. Atualizado na versão
> **1.1.0**, com o **módulo Comercial concluído**.

## Contexto do produto

- Sistema **interno** da Outmat para gerar **propostas comerciais**.
- Não é SaaS. Uso via rede local e VPN.
- **Sem autenticação.**
- Servidor Windows Server 2019; banco PostgreSQL.

## Estado funcional (1.1.0)

O **módulo Comercial está concluído**. A proposta cobre o ciclo do documento
comercial de ponta a ponta:

- **Cadastros base:** Configuração do Sistema, Clientes, Produtos e Vendedores.
- **Proposta:** cabeçalho, seções, itens, desconto, frete e informações
  comerciais, com revisões, emissão, cancelamento e auditoria.
- **Serviços complementares:** Projeto Som Ambiente e Projeto Wi-Fi Premium.
- **Quatro documentos:** PDF Detalhado, PDF Apresentação, Contrato (.docx) e
  Anexo Contratual (PDF).

**Próximos módulos, ambos operacionais e ainda sem design aprovado:**

- **Pedido de Venda**
- **Ordem de Serviço**

> Nenhum requisito desses dois módulos foi definido. Enquanto não houver design
> aprovado, **nada sobre eles deve ser presumido** a partir deste documento.

## Entidades

- **Cliente**, **Produto**, **Vendedor** — cadastros base.
- **Proposta** — documento comercial. Pertence a um cliente (e opcionalmente a
  um vendedor).
- **Revisão** — cada proposta pode ter várias revisões (versões).
- **Seção** — agrupador de itens dentro de uma revisão.
- **Item** — item dentro de uma seção.
- **ConfiguracaoSistema** — registro único de configuração.

## Regra: hierarquia da proposta

```
Proposta → Revisão → Seção → Item
```

## Regra: Seção é um agrupador NEUTRO

- A Seção **não** representa obrigatoriamente um ambiente físico.
- É apenas um **agrupador de itens**.
- Exemplos válidos de nome de seção: "Sala", "Cozinha", "Casa 92",
  "Apartamento Flávio", "Área Externa", "Recepção", "Piso Superior".
- **Nunca** tratar Seção como "Ambiente" internamente (código, nomes, textos).

## Regra: modelos de proposta

Existem **exatamente dois** modelos:

### 1. COMERCIAL

- Sempre possui **Produtos + Serviços**.
- Pode possuir **módulos opcionais**, hoje implementados como **serviços
  complementares** (ver abaixo): **Projeto Som Ambiente** e **Projeto Wi-Fi
  Premium**.
- A arquitetura permite **adicionar novos módulos sem alterar a estrutura
  principal** — novos valores de enum e linhas associadas, sem reestruturar
  tabelas.

### 2. SIMPLIFICADA

- Possui **apenas Produtos**.
- **Nunca** possui Serviços.
- **Nunca** possui módulos extras — serviços complementares são removidos
  automaticamente ao trocar o modelo para Simplificada.
- **Não gera PDF Apresentação.**

## Regra: serviços complementares

- Dois tipos: **Projeto Som Ambiente** e **Projeto Wi-Fi Premium**.
- **No máximo um de cada** por proposta.
- Pertencem à **Proposta**, não à Revisão.
- Cada um tem descrição, valor de produtos e valor de serviços; o valor total do
  módulo é a soma dos dois.
- **Nunca existem no modelo SIMPLIFICADA.**

## Regra: cálculo financeiro

O Resumo Financeiro da proposta é:

```
Automação            = Produtos + Serviços dos itens
Serviços compl.      = Projeto Som Ambiente + Projeto Wi-Fi Premium
Total                = Automação + Serviços complementares
Total Geral          = Total − Desconto + Frete
```

- O **desconto incide sobre o Total combinado** (Automação + serviços
  complementares), não apenas sobre a Automação.
- O desconto pode ser informado em **valor** ou em **percentual**.
- Nenhum total é persistido: todos derivam em tempo real.
- **`Total Geral` é a fonte oficial e única do valor da proposta.** Os quatro
  documentos citam exatamente esse valor e **nenhum deles recalcula** — é o que
  garante que Contrato e Anexo Contratual nunca divirjam.

## Regra: documentos da proposta

A mesma proposta gera quatro documentos. Nenhum deles cria dado novo: todos
consomem a proposta cadastrada.

| Documento | Formato | O que mostra |
| --- | --- | --- |
| **PDF Detalhado** | PDF | documento comercial completo, **com preço por item** |
| **PDF Apresentação** | PDF | versão institucional para envio ao cliente, **sem preço por item**; não existe na Simplificada |
| **Contrato** | **.docx** | contrato jurídico, **editável no Word antes do envio** |
| **Anexo Contratual** | PDF | escopo aprovado — o cliente vê os subtotais por projeto e o total, **nunca o preço unitário** |

Regras que valem para o Contrato:

- É **.docx** porque precisa ser ajustado no Word antes do envio (forma de
  pagamento, prazos, multa, cláusulas). Nenhum PDF atende a isso.
- O sistema **apenas substitui placeholders**. Fonte, margens, cabeçalho, rodapé,
  espaçamentos, numeração e estilos vêm do template oficial e **nunca são
  alterados**.
- Os campos que o sistema **não** conhece — prazos, multa, parcela final do
  Termo de Aceite e observações — permanecem no documento **realçados em
  amarelo**, sinalizando o preenchimento manual.
- A data do contrato é a da **revisão emitida**, nunca a data corrente: reemitir
  um contrato antigo reproduz a data original.

## Regra: configuração do sistema (singleton)

- Existe **apenas um** registro de configuração.
- Deve estar preparado para armazenar futuramente (sem mudança estrutural):
  dados da empresa, logo, endereço, telefones, WhatsApp, email, site, redes
  sociais, rodapé do PDF, textos institucionais, templates, caminhos de
  armazenamento e configurações gerais.

## Regra: cadastros base (Sprint 1)

### Cliente — Pessoa Física / Jurídica

- `tipoPessoa` é **PF** ou **PJ**.
- **PF:** `nome` é obrigatório.
- **PJ:** `empresa` é obrigatória.
- `cpfCnpj` é **opcional**, mas quando informado é **validado** (dígitos
  verificadores) e **único**.

### Produto

- **SKU** obrigatório e **único**; `descricao` obrigatória. A interface chama o
  campo de **SKU**; no banco ele continua sendo `codigo`.
- A unicidade do SKU é garantida em três níveis: índice do banco, validação no
  servidor e checagem em tempo real no formulário.
- `valorProduto` e `valorServico` são monetários ≥ 0 (`valorServico` pode ser 0).
- **Clonar produto** copia os dados descritivos e **zera SKU e valores** — o novo
  SKU é obrigatório antes de salvar.

### Vendedor

- `nome` obrigatório; `telefone` e `email` opcionais.

### Exclusão × Inativação

- Todos os cadastros possuem `ativo` (inativação). Por padrão as listagens
  mostram apenas ativos; há filtro "Mostrar inativos".
- **Exclusão** só é permitida se o registro **nunca foi usado em uma proposta**.
  Caso contrário, a exclusão é bloqueada com a mensagem:
  > "Este registro já foi utilizado em propostas e não pode ser excluído.
  > Utilize a opção Inativar."
- A regra vale para **Cliente, Vendedor e Produto**. O item da proposta
  referencia o produto de origem, então um produto já usado **não é excluído** —
  deve ser inativado (ver DECISIONS.md ADR-0104 e ADR-0207).

## Regra: armazenamento

- Todos os caminhos de arquivo são **configuráveis** (`.env`), nunca fixos.
- Compatível com Windows Server 2019.

## Ciclo de vida da proposta

- Status: **Rascunho → Emitida → Cancelada**, com transições controladas e datas
  de status imutáveis.
- **Proposta nunca é excluída** — é **cancelada**, com motivo obrigatório.
- Emitir **congela a revisão**. Alterar uma proposta emitida cria
  automaticamente a **revisão seguinte** e volta o status para Rascunho.
- Toda mudança relevante é registrada em **auditoria**, na mesma transação.
- A duplicação **não copia** as observações internas.

## Formatações padrão (Brasil)

- **Moeda:** Real (R$) — `formatCurrency`.
- **Data:** `dd/mm/aaaa` — `formatDate`.
- **CPF/CNPJ:** `000.000.000-00` / `00.000.000/0000-00` — `formatCpfCnpj`.
- **Telefone:** `(00) 0000-0000` / `(00) 00000-0000` — `formatPhone`.
