# VISION.md — Regras de negócio

> Fonte de verdade das regras de negócio do sistema. Atualizado na versão
> **1.2.0**: módulo **Comercial** e módulo **Instalações** concluídos.

## Contexto do produto

- Sistema **interno** da Outmat para gerar **propostas comerciais**.
- Não é SaaS. Uso via rede local e VPN.
- **Sem autenticação.**
- Servidor Windows Server 2019; banco PostgreSQL.

## Estado funcional (1.2.0)

O **módulo Comercial está concluído**. A proposta cobre o ciclo do documento
comercial de ponta a ponta:

- **Cadastros base:** Configuração do Sistema, Clientes, Produtos, Vendedores e
  Técnicos.
- **Proposta:** cabeçalho, seções, itens, desconto, frete e informações
  comerciais, com revisões, emissão, cancelamento e auditoria.
- **Serviços complementares:** Projeto Som Ambiente e Projeto Wi-Fi Premium.
- **Quatro documentos:** PDF Detalhado, PDF Apresentação, Contrato (.docx) e
  Anexo Contratual (PDF).

O **módulo de Instalações** (operacional) também está concluído — ver a seção
"Regra: instalações" adiante.

**Próximos módulos, ambos operacionais e ainda sem design aprovado:**

- **Pedido de Venda**
- **Ordem de Serviço**

> Nenhum requisito desses dois módulos foi definido. Enquanto não houver design
> aprovado, **nada sobre eles deve ser presumido** a partir deste documento.

## Entidades

- **Cliente**, **Produto**, **Vendedor**, **Técnico** — cadastros base.
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
- **`Total Geral` é a fonte oficial e única do valor da proposta.** Os
  documentos comerciais citam exatamente esse valor e **nenhum deles recalcula**
  — é o que garante que Contrato e Anexo Contratual nunca divirjam. O **Geral de
  Produtos** não entra nessa conta: é documento quantitativo e não exibe valor.

## Regra: documentos da proposta

A mesma proposta gera cinco documentos. Nenhum deles cria dado novo: todos
consomem a proposta cadastrada.

| Documento | Formato | O que mostra |
| --- | --- | --- |
| **PDF Detalhado** | PDF | documento comercial completo, **com preço por item** |
| **PDF Apresentação** | PDF | versão institucional para envio ao cliente, **sem preço por item**; não existe na Simplificada |
| **Contrato** | **.docx** | contrato jurídico, **editável no Word antes do envio** |
| **Anexo Contratual** | PDF | escopo aprovado — o cliente vê os subtotais por projeto e o total, **nunca o preço unitário** |
| **Geral de Produtos** | PDF | lista de material: o mesmo produto somado entre todas as Seções, **sem nenhum valor** |

Regras do Geral de Produtos (Sprint 4.0.3):

- **É documento interno de conferência**, não peça comercial. Mostra SKU,
  descrição, unidade e quantidade total — nunca preço, desconto, frete ou total.
- **Consolida todas as Seções em uma lista só.** Se o mesmo produto aparece na
  Sala (×2) e na Suíte (×4), sai uma linha com ×6. Separar por Seção anularia a
  finalidade.
- **Serviços não entram**: nem itens de serviço, nem Som Ambiente, nem Wi-Fi
  Premium.
- **Não emite a proposta.** É o único documento assim, porque conferir material
  não pode mudar o status comercial. Fica disponível em Rascunho e em Emitida.

Regras que valem para o Contrato:

- É **.docx** porque precisa ser ajustado no Word antes do envio (forma de
  pagamento, prazos, multa, cláusulas). Nenhum PDF atende a isso.
- O sistema **apenas substitui placeholders**. Fonte, margens, cabeçalho, rodapé,
  espaçamentos, numeração e estilos vêm do template oficial e **nunca são
  alterados**.
- Os campos que o sistema **não** conhece — prazo de conclusão, prazo de aceite,
  parcela final do Termo de Aceite e observações — permanecem no documento
  **realçados em amarelo**, sinalizando o preenchimento manual.
- **Termos comerciais fixos** (Release 1.5.1, ADR-0411): o **prazo de início** é
  de 10 (dez) dias úteis contados da **autorização formal do CONTRATANTE**
  (cláusula 3.1) e a **multa de rescisão** por iniciativa do CONTRATANTE é de
  **20%** sobre o saldo do contrato (cláusula 9.2). Os dois deixaram de ser
  preenchidos à mão. A **multa de inadimplência** da cláusula 8.1 é outra coisa e
  **permanece em 2%**.
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

### Técnico

- `nome` obrigatório; `ativo` (default `true`). Nenhum outro campo.
- **Não é Vendedor:** um técnico não vende, e reaproveitar o cadastro de
  Vendedor poluiria o autocomplete da Proposta e distorceria a regra de
  exclusão "já foi usado em uma proposta" — um Técnico nunca é usado em uma.
- **Não é Usuário:** não há login, permissão ou agenda. Quando existir
  autenticação, "registrado por" será campo novo e aditivo, separado do
  vínculo de responsável.
- É o responsável das Instalações desde a Sprint 4.1 (ver "Regra:
  instalações" adiante e DECISIONS.md ADR-0408).

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
- **Técnico segue o mesmo princípio, com alvo diferente:** a exclusão é
  bloqueada quando o técnico já foi usado em uma Instalação (como responsável
  atual ou em algum registro da cronologia), não em uma proposta — Técnico
  nunca é usado em proposta nenhuma. Mensagem própria orientando a inativar
  (ver DECISIONS.md ADR-0408).

## Regra: armazenamento

- Todos os caminhos de arquivo são **configuráveis** (`.env`), nunca fixos.
- Compatível com Windows Server 2019.

## Regra: instalações

Acompanhamento **operacional** de uma instalação para um cliente. Independe de
Pedido de Venda e de Ordem de Serviço — a instalação é cadastrada manualmente.

- **Cliente é obrigatório** e vem do cadastro existente.
- **Endereço é copiado do cliente** no momento da criação e passa a pertencer à
  instalação: alterar o cadastro do cliente depois **não** muda instalações
  antigas. Não existe endereço alternativo de obra.
- **Numeração própria**, começando em 1001, independente das propostas e nunca
  reutilizada.
- **Proposta relacionada é opcional** e é apenas um vínculo: não importa itens,
  não sincroniza valores.
- **Responsável é vínculo com o cadastro de Técnicos** (desde a Sprint 4.1,
  ADR-0408 — supersede parcial do ADR-0400). "Responsável atual" da Instalação
  é estado corrente e acompanha o cadastro; cada registro da cronologia guarda,
  além do vínculo, o nome do responsável no momento em que lhe foi atribuído
  — snapshot que sobrevive a uma renomeação posterior do cadastro.
- **Status:** A agendar · Agendada · Aguardando material · Em andamento ·
  Adiada · Concluída · Cancelada. **Concluir é mudar o status.**
- **Instalação nunca é excluída quando tem histórico** — é cancelada, e continua
  visível na listagem.
- **Apelido (1.6.0):** cada instalação tem um apelido próprio — "Casa
  Alphaville", "Apartamento Moema" —, porque o mesmo cliente tem várias obras. É
  a **identificação principal na listagem** e entra na busca. Nasce sugerido pelo
  nome do cliente, é editável a qualquer momento e, **depois de personalizado,
  trocar o cliente não o sobrescreve**. Pertence à Instalação, nunca ao Cliente.
- **Salvar os dados gerais volta para a listagem** (criação e edição). Na criação
  o aviso traz a ação "Abrir", para quem quer seguir direto ao workspace.
  Operações da **cronologia permanecem no workspace** — são outro fluxo.

### Cronologia

O histórico operacional é formado por **registros independentes**, um por
acontecimento — nunca um campo único que se sobrescreve.

- Tipos: visita ao cliente, atualização interna, material comprado, alteração de
  escopo, pendência, conclusão e outro.
- Todo registro exige **responsável** e **relatório**.
- A **data do acontecimento é independente da data de cadastro**: uma visita
  feita ontem e registrada hoje aparece **ontem** na cronologia. Isso permite
  trazer o histórico de instalações que já estavam em andamento.
- Um acontecimento **não pode estar no futuro** — ainda não aconteceu.
- A cronologia é ordenada pelo **acontecimento**, não pelo cadastro.
- **Anexos (1.6.0):** cada registro aceita até **10 arquivos**, de até **10 MB**
  cada, em **JPG, PNG, WebP ou PDF** — foto da visita, nota fiscal do material.
  Ficam no **card do registro**, não no formulário: o arquivo se liga a um
  registro que já existe. Excluir o registro leva os anexos junto; **cancelar a
  instalação não remove nada**.

### Custos extras

- Pertencem ao **acontecimento**, não à instalação. Um registro pode ter zero,
  um ou vários custos.
- Categorias: Material, Mão de obra, Deslocamento, Terceiros, Frete e Outros.
- O valor precisa ser **maior que zero**.
- **Total do registro** = soma dos seus custos. **Total da instalação** = soma de
  todos os custos de todos os registros. Nada é armazenado pronto; tudo é
  calculado a partir dos lançamentos.
- **Custos extras são internos.** Não alteram o valor da proposta, não geram
  cobrança, não criam aditivo e não tocam contrato, PDF ou comissão. Servirão
  para análise de margem no futuro.

### Exclusão de registro

- Registro **sem custos** pode ser excluído.
- Registro **com custos** não pode: a exclusão é bloqueada e o sistema orienta a
  editar o registro. Histórico financeiro não desaparece por engano.

## Ciclo de vida da proposta

- Status: **Rascunho → Emitida → Aprovada → Cancelada**, com transições
  controladas e datas de status imutáveis.
- **Proposta nunca é excluída** — é **cancelada**, com motivo obrigatório.
- Emitir **congela a revisão**. Alterar uma proposta com a revisão congelada cria
  automaticamente a **revisão seguinte** e volta o status para Rascunho.

### Aprovação (1.6.0)

- **Aprovar registra que o cliente aceitou AQUELE conteúdo**, não a proposta em
  geral. O fato fica na **revisão** (`aprovadaEm`), do mesmo jeito que a emissão.
- Só se aprova o que foi **emitido** — o cliente aprova o que recebeu.
- **Qualquer alteração salva invalida a aprovação, sozinha.** A revisão nova
  nasce sem aprovação e a proposta volta a Rascunho; a revisão aprovada continua
  registrando o que foi aprovado e quando. Uma proposta modificada nunca segue
  aparecendo como Aprovada.
- **Desfazer aprovação** existe para o clique errado: volta a Emitida e preserva
  o documento. Só mexe na revisão atual — histórico não se reescreve.
- Toda mudança relevante é registrada em **auditoria**, na mesma transação.
- A duplicação **não copia** as observações internas.

## Formatações padrão (Brasil)

- **Moeda:** Real (R$) — `formatCurrency`.
- **Data:** `dd/mm/aaaa` — `formatDate`.
- **CPF/CNPJ:** `000.000.000-00` / `00.000.000/0000-00` — `formatCpfCnpj`.
- **Telefone:** `(00) 0000-0000` / `(00) 00000-0000` — `formatPhone`.
