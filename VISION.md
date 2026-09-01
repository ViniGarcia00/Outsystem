# VISION.md — Regras de negócio

> Fonte de verdade das regras de negócio do sistema. Atualizado na versão
> **1.2.0**: módulo **Comercial** e módulo **Instalações** concluídos.

## Contexto do produto

- Sistema **interno** da Outmat para gerar **propostas comerciais**.
- Não é SaaS. Uso via rede local e VPN.
- **Sem autenticação.**
- Servidor Windows Server 2019; banco PostgreSQL.

## Estado funcional (1.9.0)

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

O **módulo de Pós-venda** (1.9.0) entregou dois submódulos: **Troca Antecipada**
e **Ordem de Serviço de pós-venda/manutenção** — ver "Regra: pós-venda" adiante.

**Próximo módulo operacional, ainda sem design aprovado:**

- **Pedido de Venda**

> Nenhum requisito dele foi definido. Enquanto não houver design aprovado, **nada
> sobre ele deve ser presumido** a partir deste documento.
>
> ⚠️ **A Ordem de Serviço entregue na 1.9.0 é de PÓS-VENDA / MANUTENÇÃO DE
> EQUIPAMENTOS.** Uma eventual **Ordem de Serviço de instalação** é outro
> processo, ainda sem design aprovado, e nada do módulo atual a antecipa.

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
- **Anexos (1.6.0; formatos ampliados na 1.8.0):** cada registro aceita até **10
  arquivos**, de até **10 MB** cada, em **JPG, PNG, WebP, PDF, Word (.doc,
  .docx) e Excel (.xls, .xlsx)** — foto da visita, nota fiscal do material,
  orçamento, planilha de medição, laudo. Ficam no **card do registro**, não no
  formulário: o arquivo se liga a um registro que já existe. Excluir o registro
  leva os anexos junto; **cancelar a instalação não remove nada**.

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

## Regra: pós-venda (1.9.0)

Controle **operacional** do que acontece depois que o produto já está instalado.
Nasceu de dois casos reais: uma **fechadura** substituída antes da devolução, e
**sete interruptores** enviados com o retorno vindo em duas etapas.

São **dois processos distintos**, e o negócio os confunde porque acontecem em
sequência:

| | Troca Antecipada | Ordem de Serviço |
|---|---|---|
| Responde | "o defeituoso voltou?" | "qual era o defeito, e o que foi feito?" |
| Fecha quando | o retorno é resolvido | a análise/reparo termina |
| Existe sem a outra? | sim | **sim** |

> ⚠️ Esta Ordem de Serviço é de **pós-venda / manutenção de equipamentos**. Não
> confundir com uma futura OS de instalação.

### Troca Antecipada

- **Cliente é obrigatório** e vem do cadastro. **Referência** também: é o texto
  que identifica o processo na listagem ("Fechadura entrada social", "7
  interruptores sala/cozinha").
- **Numeração própria**, começando em 1001, independente de tudo o mais.
- **Destinatário do substituto:** Cliente, Instalador ou Outro. Quando não é o
  cliente, o nome é obrigatório — **não existe cadastro de instalador/parceiro**.
- **Produtos:** cada um vem do cadastro **ou** é descrito manualmente ("Outro /
  Produto não cadastrado"). Nunca os dois em branco. A peça que volta nem sempre
  está no catálogo.
- **Três quantidades por produto:** enviada, esperada de retorno e devolvida.
  **Devolvida nunca excede a esperada.** O que ainda falta voltar é sempre
  calculado, nunca digitado.
- **Enviado e esperado são independentes:** dá para enviar 1 substituto e esperar
  0 de volta, quando o defeituoso fica com o cliente por acordo.
- **Status:** Aberta · Envio pendente · Devolução pendente · Em análise · Valor
  pendente · Finalizada · Cancelada. Qualquer transição é permitida.
  **`Valor pendente` é status operacional, não financeiro** — significa que
  alguém precisa decidir o que fazer com um valor, não que existe título aberto.
- **Finalizar é ação explícita.** Havendo produto pendente, o sistema mostra
  **quais** e pede confirmação — e **finaliza assim mesmo** se confirmado.
  Produto perdido, acordo e cobrança futura são desfechos reais; bloquear
  empurraria o usuário a registrar uma devolução que não houve.
- **Diagnóstico/conclusão é opcional** e nunca bloqueia a finalização: a análise
  técnica principal acontece depois, na Ordem de Serviço.
- **Custos operacionais** (motoboy, sedex, frete, visita) são lançados nos
  registros da timeline, e o acumulado é sempre calculado.

### Ordem de Serviço de pós-venda

- **Funciona sem Troca Antecipada.** A criação manual é o caminho principal: uma
  peça pode chegar para conserto sem nunca ter havido envio antecipado.
- **Numeração própria**, começando em 1001, independente da Troca.
- **Produtos** seguem a mesma regra (cadastro ou descrição manual), com
  quantidade inteira **maior que zero**, e ganham dois campos técnicos:
  **diagnóstico encontrado** e **solução aplicada**.
- **Status:** Aberta · Aguardando análise · Em análise · Em manutenção ·
  Aguardando peça · Finalizada · Cancelada.
- **Finalizar exige informação técnica:** conclusão geral **ou** diagnóstico /
  solução de ao menos um produto. A OS existe para responder o que era o defeito
  e o que foi feito; finalizá-la em branco recriaria o buraco que o módulo veio
  fechar.
- **Custos próprios** (peça, frete, terceirização, material) — **nunca copiados
  nem somados aos da Troca**. São históricos independentes.

### Vínculo entre os dois

- O vínculo é **opcional**, e pode ser escolhido na criação manual da OS entre as
  trocas **do mesmo cliente** que ainda não têm ordem de serviço.
- **Uma Troca tem zero ou uma Ordem de Serviço.**
- Da Troca, o botão **"Criar Ordem de Serviço"** abre a OS já preenchida com o
  cliente, a referência de origem e os **produtos devolvidos**, com a quantidade
  devolvida no momento.
- O responsável da Troca só é herdado pela OS se ele **for técnico**. Sendo
  administrativo, a OS nasce sem responsável e alguém escolhe o técnico — o
  sistema nunca inventa um substituto.
- **A OS recebe uma fotografia, não um espelho.** Se a Troca tinha 5 de 7
  devolvidos, a OS nasce com 5 — e continua com 5 mesmo depois de os outros 2
  voltarem. O que chegou depois é outro fato.
- **Sem produto devolvido, a OS não é criada** e o sistema explica por quê.

### Timeline, anexos e cancelamento

- Os dois processos têm **timeline** de acontecimentos (quando ocorreu, quem fez,
  o que aconteceu), com custos por registro. Fatos anteriores à abertura são
  aceitos; fatos futuros, não.
- **Anexos** por registro: JPG, PNG, WebP, PDF, Word e Excel — **10 MB por
  arquivo, 10 por registro**, as mesmas regras das Instalações.
- **Registro com custo lançado não é excluído** — corrija os custos antes.
- **Cancelar nunca apaga.** Timeline, custos, produtos e anexos são preservados,
  e o processo continua acessível pelo filtro de status.
- **Responsável** vem do cadastro de **Usuários**, com exigência diferente em
  cada processo:
  - **Troca Antecipada:** qualquer usuário **ativo**. Acompanhar envio,
    devolução, frete e cobrança é trabalho frequentemente administrativo, e
    exigir técnico limitaria o cadastro sem razão. Vale também para quem assina
    cada registro da timeline.
  - **Ordem de Serviço:** precisa ter o papel de **técnico** — ali o trabalho é
    análise e reparo. Vale também para a timeline dela.
  - **Usuário inativo** não pode receber vínculo novo em nenhum dos dois; o
    vínculo já existente é preservado.
  - **Nenhum papel novo foi criado.** Renomear o cadastro não reescreve fatos já
    registrados.

### Fora de escopo (1.9.0)

Estoque, número de série, garantia, financeiro, cobrança, OS de instalação,
Pedido de Venda e cards de Dashboard. Registrados em `BACKLOG.md`.

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

### Contrato: o texto jurídico da época (1.7.0)

- **O contrato sai na versão com que a proposta foi emitida**, não na versão em
  vigor hoje. Publicar um texto novo não reescreve, em silêncio, contrato nenhum
  que já foi enviado ao cliente. Versões antigas do documento nunca são apagadas.
- **A pré-visualização é o documento.** Um rascunho já mostra o texto que a
  emissão vai gerar — não existe troca de versão jurídica entre ver e emitir.
- **Rev. 4 (vigente desde 28/08/2026):** prazo de execução e parcela final
  deixaram de ser preenchidos à mão no Word e passaram a vir da proposta, com as
  observações do Termo de Aceite. Enquanto os dois primeiros não estiverem
  informados, o sistema **não gera** o contrato — em vez de entregar um documento
  com "de  dias úteis" para assinatura.
- **Contratos antigos continuam sendo gerados** exatamente como eram, sem exigir
  campos que não existiam quando foram emitidos.
- Toda mudança relevante é registrada em **auditoria**, na mesma transação.
- A duplicação **não copia** as observações internas.

## Formatações padrão (Brasil)

- **Moeda:** Real (R$) — `formatCurrency`.
- **Data:** `dd/mm/aaaa` — `formatDate`.
- **CPF/CNPJ:** `000.000.000-00` / `00.000.000/0000-00` — `formatCpfCnpj`.
- **Telefone:** `(00) 0000-0000` / `(00) 00000-0000` — `formatPhone`.
