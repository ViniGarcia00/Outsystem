# CHANGELOG

Todas as mudanças relevantes deste projeto são documentadas aqui.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o
projeto adota [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.2.0] — 2026-08-18

Entrega do **módulo de Instalações** — o primeiro módulo operacional do sistema,
aberto depois do encerramento do Comercial. Reúne as Sprints 4.0.1 (fundação) e
4.0.2 (cronologia e custos).

**MINOR:** módulo novo, inteiramente aditivo. Nenhum comportamento existente
muda; nada do módulo Comercial foi alterado.

### Sprint 4.0.2 — Cronologia e Custos. Ver ADR-0401.

#### Adicionado

- **Cronologia da instalação:** cada acontecimento é um **registro independente**
  com tipo, data/hora do fato, responsável e relatório. Tipos: visita ao cliente,
  atualização interna, material comprado, alteração de escopo, pendência,
  conclusão e outro.
- **Data do acontecimento separada da data de cadastro:** uma visita feita ontem
  e registrada hoje aparece **ontem** na cronologia. Acontecimentos anteriores à
  criação da instalação são aceitos — o que permite trazer o histórico de
  instalações que já estavam em andamento.
- **Custos extras por acontecimento**, com categorias Material, Mão de obra,
  Deslocamento, Terceiros, Frete e Outros. Um registro pode ter zero, um ou
  vários custos; descrição é opcional e o valor precisa ser maior que zero.
- **Totais derivados:** total por registro e total acumulado da instalação, mais
  a quebra por categoria. Nada é persistido — tudo é calculado a partir dos
  custos lançados.
- **Timeline no workspace**, com o resumo de custos no topo e um card por
  acontecimento mostrando data/hora, tipo, responsável, relatório, custos e total.
- **Edição** de registro e de seus custos, com substituição transacional dos
  custos.

#### Regras

- **Exclusão de registro:** permitida quando não há custos lançados; **bloqueada**
  quando há, com mensagem orientando editar. O histórico financeiro não some sem
  querer.
- **Custos extras são internos:** não alteram o valor da Proposta, não geram
  cobrança e não tocam contrato, PDF ou comissão.
- A cronologia **não** é auditoria técnica: criar ou editar um acontecimento não
  gera evento de auditoria do sistema.

### Sprint 4.0.1 — Fundação de Instalações. Ver ADR-0400.

Primeiro módulo **operacional** do sistema, aberto após o encerramento do
Comercial. O roadmap foi reordenado: Instalações vem antes de Pedido de Venda e
Ordem de Serviço, porque já existem instalações em andamento sem controle.

Parte da release **1.2.0**, fechada ao final da Sprint 4.0.2.

#### Adicionado

- **Cadastro manual de Instalação**, com numeração comercial própria iniciando em
  **1001**, independente da numeração de Propostas.
- **Cliente obrigatório**, escolhido por autocomplete sobre o cadastro existente
  — nenhum cadastro paralelo de cliente foi criado.
- **Endereço por snapshot do Cliente**, derivado no servidor: a instalação
  guarda o endereço do momento da criação e **alterar o cadastro do cliente
  depois não muda instalações antigas**. Os campos são somente leitura.
- **Proposta relacionada opcional** — vínculo puro, sem importar itens nem
  sincronizar valores.
- **Responsável atual** em texto livre, sem cadastro, sem login e sem vínculo com
  Vendedor.
- **Status operacional**: A agendar · Agendada · Aguardando material · Em
  andamento · Adiada · Concluída · Cancelada. Concluir é mudar o status.
- **Datas** prevista e agendada, período e observações gerais.
- **Listagem** `/instalacoes` com busca instantânea por número, cliente, projeto,
  endereço e responsável, e filtro por status.
- **Workspace** `/instalacoes/[id]` com cabeçalho editável e cancelamento com
  motivo. Instalação cancelada abre em modo somente leitura e **permanece na
  listagem** — nada é excluído.
- **Auditoria técnica** da instalação (criação, alteração, mudança de status e
  cancelamento), gravada na mesma transação da escrita.
- Item **Instalações** no menu principal.

#### Notas

- A seção **Cronologia** do workspace é um placeholder: registros de visita,
  atualizações internas, materiais e custos são da Sprint 4.0.2.
- Nenhum arquivo do módulo Comercial foi alterado, nenhum cálculo financeiro de
  Proposta foi tocado e nenhum campo antecipa Pedido de Venda ou Ordem de
  Serviço.

## [1.1.0] — 2026-08-18

Release consolidada do **módulo Comercial**. Reúne tudo o que foi entregue desde
a 1.0.0 e nunca havia sido formalizado: Serviços Complementares, PDF Detalhado,
PDF Contratual, PDF Apresentação, a correção de build do Windows Server e a
Documentação Contratual.

**MINOR:** todas as entregas são **aditivas** — nova entidade com migration
aditiva, novos endpoints, novos documentos e campos acrescentados ao DTO.
Nenhuma remoção de API nem quebra de contrato.

> As Sprints estão listadas da mais recente para a mais antiga. **A numeração não
> é cronológica:** 3.0, 3.1 (a) e 3.2.1 ocorreram *antes* das 2.9.x e 2.10.x. O
> rótulo "Sprint 3.1" foi usado duas vezes — **3.1 (a)** é o PDF Apresentação
> (ADR-0301) e **3.1 (b)** é a Documentação Contratual (ADR-0330).

### Sprint 3.1 (b) — Documentação Contratual. Ver ADR-0330.

Encerra o módulo Comercial. A proposta passa a ter **quatro documentos**: PDF
Detalhado, PDF Apresentação, Contrato (.docx) e Anexo Contratual (PDF).

#### Adicionado

- **Contrato em .docx** gerado a partir do template oficial da Outmat, via
  `docxtemplater` + `pizzip`. Editável no Word antes do envio — requisito que
  nenhum PDF atende. Endpoint `GET /propostas/[id]/contrato`, baixado como
  `attachment` com o nome `Contrato - Proposta {Nº} - {Nome} Rev.{N}.docx`.
- **Template versionado e marcação reproduzível:** o `.docx` oficial fica em
  `public/templates/contrato/contrato-outmat.oficial.docx` e
  `scripts/marcar-template-contrato.mjs` gera o template marcado. O script
  **aborta** se qualquer parte do XML fora de `<w:t>` (e do realce) mudar,
  provando que fonte, margens, cabeçalho, rodapé, espaçamentos, numeração e
  estilos ficam intactos.
- **Marcação seletiva dos placeholders:** só os campos que o sistema preenche
  viram tag. Os 4 `[Nº]` de prazos/multa, `[VALOR]` e `[se houver]` permanecem
  literais e realçados em amarelo, para preenchimento manual no Word.
- **Valor por extenso** via `extenso`; data com timezone fixa
  `America/Sao_Paulo`, vinda da revisão emitida e nunca de `new Date()`.
- Botões **"Emitir Contrato"** e **"Emitir Anexo Contratual"** no workspace.
- Novas dependências (todas MIT): `docxtemplater`, `pizzip`, `extenso`.

#### Alterado

- Botão "PDF Contratual" → **"Emitir Anexo Contratual"**. Apenas o rótulo: a rota
  `/contratual`, o documento e o nome de download continuam inalterados.
- `filename.ts` generalizado para aceitar extensão e disposição, **mantendo os
  três nomes de PDF existentes byte a byte**.

#### Corrigido

- **Realce amarelo nos campos automáticos.** O template oficial realça os
  placeholders e o docxtemplater preserva a formatação do run ao trocar o texto —
  nome, CPF, valor, data e forma de pagamento saíam pintados de amarelo (e a
  forma de pagamento em itálico). O script de marcação passou a limpar
  `highlight`/`i` apenas dos runs que viram tag do sistema. Realces: 18 → 6.

### Refinamentos de Produtos e correções de ambiente

#### Adicionado

- **Reordenação de itens da proposta por Drag & Drop** (`@dnd-kit`), iniciada
  apenas pela alça, substituindo os botões de mover para cima/baixo.
- **Clonar Produto:** ação por linha que abre `/produtos/novo?clonarDe=<id>`,
  copiando os dados descritivos e zerando SKU e valores.
- **SKU único em três níveis:** banco, backend (`skuDisponivel` + P2002) e
  frontend (checagem assíncrona + guarda no envio).

#### Alterado

- Nomenclatura **"Código" → "SKU"** em toda a interface (formulário, listagem,
  busca, validações, tabela, PDF e autocomplete). Nomes internos e de banco
  (`codigo`) inalterados.
- Listagem de Produtos preserva busca, ordenação, página e filtro ao voltar da
  edição, destacando o item recém-editado.
- Descrição dos itens da proposta em até 2 linhas; fonte dos inputs de valor
  ajustada.

#### Corrigido

- Rodapé financeiro do PDF.
- Autenticação do banco e configuração do ambiente de desenvolvimento.

### Sprint 2.10.3 — Refinamentos do PDF Contratual

#### Adicionado

- **Subtotais dos projetos contratados:** a tabela segue sem preço por produto,
  mas o documento fecha a Automação com "Subtotal Automação" e cada projeto
  (Som/Wi-Fi) exibe o seu. O cliente vê o subtotal de cada projeto e o valor
  final — **nunca o preço unitário**.
- **Identificação do contratante por tipo de pessoa:** PF → Nome/CPF/RG; PJ →
  Razão Social/CNPJ/Inscrição Estadual, além de telefone, e-mail e endereço.
  Opcionais vazios são ocultados, sem placeholder.
- **Nomes de download padronizados** para os três PDFs (`nomeArquivoPdf` +
  `contentDispositionPdf`), com primeiro nome, número e revisão; caracteres
  inválidos no Windows removidos.

#### Alterado

- Resumo Financeiro contratual: Automação → Som → Wi-Fi → Subtotal Geral →
  Desconto → Frete → TOTAL, em estrutura fixa (R$ 0,00 quando ausente).
- PDF Apresentação: fonte do slide 06 aumentada.

### Sprint 2.10.2 — PDF Contratual (hoje Anexo Contratual)

#### Adicionado

- **PDF Contratual:** mostra tudo o que será entregue **sem preço por item** — o
  cliente vê apenas o Total da Proposta. Endpoint
  `GET /propostas/[id]/contratual` e botões no workspace.
- **Parametrização do documento** por variante (`detalhado` | `contratual`),
  reutilizando cabeçalho, rodapé, cliente, tabela e financeiro. No contratual a
  tabela perde as colunas de valor e o título vira "ANEXO CONTRATUAL".

### Sprint 2.10.1 — PDF Detalhado

#### Alterado

- PDF Comercial renomeado para **"PDF Detalhado"**; nomenclatura padronizada
  (PDF Detalhado / PDF Apresentação).
- Resumo Financeiro reescrito consumindo `dto.resumo`: Produtos · Serviços da
  Automação · Projeto Som Ambiente · Projeto Wi-Fi Premium · Desconto · Frete ·
  TOTAL DA PROPOSTA, em **estrutura fixa**. Valores 100% do DTO, nunca
  recalculados no PDF.

#### Adicionado

- Seções "Projeto Som Ambiente" e "Projeto Wi-Fi Premium" no PDF, condicionais à
  existência do serviço. A Simplificada oculta serviços.

### Sprint 2.9.4 — Refinamentos do Módulo de Propostas

#### Alterado

- **Resumo Financeiro único** substitui o rodapé de totais e o "Resumo do
  Investimento".
- **O Desconto passa a incidir sobre o Total combinado**
  (`calcularResumoFinanceiro`): Total Geral = Automação + Serviços − Desconto +
  Frete. Esta passou a ser a **fonte oficial do valor** para todos os documentos.
- Listagem: coluna "Valor" exibe o Total Geral; ordem das colunas ajustada.
- Serviços Complementares passam a aparecer na Nova Proposta e ficam **ocultos no
  modelo Simplificado** (auto-removidos ao trocar).
- Observações Comerciais/Técnicas removidas da tela (mantidas no banco).

#### Corrigido

- PDF Apresentação bloqueado no modelo Simplificado; ajustes finos dos slides.

### Sprint 2.9.3 — PDF Apresentação com Som Ambiente, Wi-Fi e Investimento Total

#### Adicionado

- Estrutura oficial de **13 templates** (antes 10), com **slides condicionais por
  existência**: 09 Projeto Som Ambiente, 10 Projeto Wi-Fi Premium, 11
  Investimento Total. Contagem final: Automação = 10 · +Som = 12 · +Wi-Fi = 12 ·
  ambos = 13.
- Slide 11 (Investimento Total): Automação + Som/Wi-Fi + divisor + total, com
  valores consumidos do DTO.
- `PropostaPdfDTO` ganhou `servicos[]` e `investimento` (aditivo).

#### Alterado

- Slide 08 passa a exibir o Investimento **da Automação apenas**.

### Sprint 2.9.2 — Integração Financeira dos Serviços Complementares

#### Adicionado

- Investimento Geral = Automação + Σ(valor total dos serviços), via
  `calcularInvestimentoComplementar` e `calcularInvestimento` em `totais.ts` —
  **camada aditiva**, com `calcularTotais` intacto.
- Componente "Resumo do Investimento" no workspace.
- Testes financeiros: 4 cenários + prova de aditividade.

### Sprint 2.9.1 — Serviços Complementares (estrutura e cadastro)

#### Adicionado

- Entidade **`PropostaServico`** (Som Ambiente / Wi-Fi Premium), relação
  `Proposta` 1→N com **unicidade por tipo** — no máximo um de cada por proposta.
- **Migration aditiva** `20260708000000_servicos_complementares`.
- Seção "Serviços Complementares" no workspace, entre Conteúdo e Finalização,
  com edição em memória e salvamento único.
- Validações Zod para os serviços.

### Sprint 3.2.1 — Correção da build de produção (Windows Server). Ver ADR-0321.

Correção **exclusiva de build** — nenhuma regra de negócio, banco, Prisma, API,
cálculo, PDF ou tela foi alterada.

#### Corrigido

- **`npm run build` falhava no Windows Server 2019** na etapa de *prerender*
  (`Error occurred prerendering page "/clientes/novo"` →
  `Invariant: Expected workStore to be initialized` — bug interno do Next.js,
  código `E1068`), enquanto passava na máquina de desenvolvimento.
- **Causa raiz:** as páginas estáticas de formulário (`/clientes/novo`,
  `/produtos/novo`, `/vendedores/novo`, `/dashboard`, `/`) eram **pré-renderadas
  em build**. A resolução de metadados durante o prerender lê o `workStore`
  (`AsyncLocalStorage`) do Next; sob a configuração de **worker único** derivada
  de `experimental.cpus = max(1, nº de núcleos − 1)` — 1 no servidor (1–2 vCPU),
  11 na máquina de dev (12 núcleos) — o Next entra num caminho de geração
  estática em que esse contexto não é inicializado e lança a *invariant*. Por
  isso o erro só aparecia no servidor.
- **Correção (mínima e definitiva):** `export const dynamic = "force-dynamic"`
  no **layout raiz** (`src/app/layout.tsx`). Todas as páginas passam a ser
  renderizadas **sob demanda** (`ƒ`) em vez de pré-renderadas (`○`); o caminho de
  prerender que dispara o bug do Next deixa de ser executado — em qualquer nº de
  núcleos ou sistema operacional. As páginas renderizam exatamente o mesmo HTML;
  apenas a estratégia de renderização muda (apropriado para uma ferramenta
  interna, orientada a dados e sem SEO). Nenhuma outra alteração.
- **Por que no layout e não página a página:** a abordagem por página deixa a
  rota sintética `/_not-found` (gerada pelo Next, sem arquivo próprio) ainda
  **pré-renderada** sob o mesmo layout+metadados — exatamente o caminho que
  falha. Cobri-la exigiria um `not-found.tsx` custom, que **troca o 404 padrão do
  Next** (mudança de comportamento) e adiciona arquivos. O `force-dynamic` no
  layout neutraliza `/_not-found` junto, em **1 linha**, sem alterar
  comportamento. Verificado por build: sobram estáticas apenas `/_global-error` e
  `/favicon.ico` (internas, sem resolução de metadados → sem risco).

### Ajustes de infraestrutura — PDF Projeto e seed do Prisma

#### Corrigido

- Configuração do `prisma.config.ts` e artes das páginas 6, 8 e 9 do PDF
  Apresentação substituídas por versões mais leves.
- Removido o arquivo avulso `ma.config.ts`, incluído por engano no commit
  anterior.

### Sprint 3.1 (a) — PDF Apresentação com templates gráficos. Ver ADR-0301.

#### Alterado

- **PDF Apresentação passou a usar os templates gráficos** (`public/templates/
  presentation/page-01..10.png`) como **plano de fundo de página inteira**, em
  **landscape 16:9** (960×540 pt). Nenhuma página é redesenhada.
- **Páginas fixas** (2,3,4,5,7,10): apenas o template de fundo.
- **Páginas dinâmicas** (1,6,8,9): o template de fundo + **sobreposição só dos
  campos variáveis** — capa (Nome do Projeto + Nome do Cliente), itens (seções +
  produtos, sem preço/quantidade), investimento (Valor Total + prazo) e forma de
  pagamento. Reutiliza o mesmo `PropostaPdfDTO`.
- Coordenadas dos campos centralizadas em `coords.ts` (provisórias — ajuste fino
  quando os templates com áreas em branco forem recebidos). PDF Comercial
  inalterado; sem banco/migration/Prisma.

#### Adicionado (ajustes funcionais, rotulados "Sprint 3.1.1")

- "Gerar PDF Apresentação" passa a **emitir a proposta**, reutilizando o mesmo
  `emitirPropostaAction` do PDF Comercial.
- **Forma de Pagamento** vira `Textarea` editável, com valor padrão nas propostas
  novas — registros existentes nunca são sobrescritos.
- Legenda de cores de status removida da listagem.

### Sprint 3.0 — Fundação do PDF Apresentação. Ver ADR-0300.

Recurso **estrutural** (novo formato de exportação). O módulo de Propostas
permanece em 1.0.0; a versão só será incrementada quando o recurso estiver
concluído (Sprint 3.1). Nada do PDF Comercial, do banco ou do Prisma foi
alterado.

#### Adicionado

- **PDF Apresentação** (fundação): novo gerador em
  `src/features/propostas/pdf/presentation/` (10 páginas) + endpoint
  `GET /propostas/[id]/presentation` (`application/pdf`), no mesmo padrão do PDF
  Comercial. **Reutiliza exatamente** o carregamento de dados existente
  (`getPropostaPdfData` → `PropostaPdfDTO`; mesma proposta/cliente/produtos/
  serviços/totais) — sem consultas nem regras paralelas.
- Botão **"Gerar PDF Apresentação"** ao lado do PDF Comercial no workspace.
- Páginas **dinâmicas** ligadas aos dados reais: capa (cliente + nome do
  projeto), itens do projeto (seções + produtos, sem preços/quantidades),
  investimento (valor total + prazo) e forma de pagamento. Páginas **fixas**
  (Quem Somos, Por que Automatizar, Cases, Como Trabalhamos, Serviços,
  Obrigado) com placeholders — layout premium a ser detalhado na Sprint 3.1.
- `PropostaPdfDTO` ganhou `nomeProjeto` (aditivo; não altera o PDF Comercial).

## [1.0.0] — 2026-07-08

### Sprint 2.8 — Homologação final e encerramento do módulo de Propostas. Ver ADR-0228.

**Primeira versão homologada para produção** do módulo de Propostas.

Esta Sprint **não adicionou funcionalidades** nem alterou UX/layout/PDF/banco de
dados: foi de validação, estabilização e documentação. O módulo é considerado
**homologado, estável e pronto para produção**.

#### Homologado

- **Fluxos validados:** Configurações · Clientes · Produtos · Vendedores ·
  criação de proposta · Proposta Completa · Proposta Simplificada · Seções ·
  Produtos · Serviços · Totais · Desconto · Frete · Informações Comerciais ·
  Revisões · Emissão · Cancelamento · PDF Comercial.
- **Quality Gate:** ESLint 0 · Typecheck 0 · Build 0 · Testes unitários 17/17 ·
  Smoke 7/7 · `/api/health` 200 (db up).
- **Revisão técnica:** sem TODOs/`console`/`debugger`, sem `.only` em testes, sem
  código morto/temporário a remover; imports e diretivas `eslint-disable`
  justificados. Nenhuma correção de comportamento foi necessária.

#### Versionamento

- `VERSION` e `package.json`: **0.12.4 → 1.0.0**.

> As próximas evoluções ocorrerão em **novos módulos independentes** (a começar
> por "PDF Projeto"). Oportunidades de melhoria estão registradas em
> [`BACKLOG.md`](BACKLOG.md) — **Backlog Futuro** (não implementadas nesta versão).

## [0.12.4] — 2026-07-07

### Sprint 2.7.8 — Refinamentos de UX e PDF. Ver ADR-0227.

#### Propostas

- Novo campo **Nome do Projeto** (na mesma linha do Cliente); pertence à
  Proposta e é persistido. Vendedor e Validade da proposta em linhas próprias.
- **Desconto percentual** passa a exibir também o **valor monetário**
  correspondente (Subtotal × Percentual); desconto em valor inalterado.
- **Legenda de status** reorganizada em bloco contido, mantendo a
  responsividade (cores e badges inalterados).

#### PDF

- Tabela: **Código em negrito**, Descrição em peso normal (demais colunas
  inalteradas).

## [0.12.3] — 2026-07-07

### Sprint 2.7.7 — Refinamentos de UX e PDF. Ver ADR-0226.

#### Propostas

- **Desconto/Frete:** interpretação (R$/%) atualiza **em tempo real** ao digitar
  e mostra **"-"** quando vazio. O **Frete** inicia **vazio** (não preenche
  "R$ 0,00") e segue o mesmo padrão visual do Desconto.
- Botões do workspace movidos para a **parte inferior** (mesmo padrão dos demais
  módulos).
- **Badge de status** ao lado do número/revisão no workspace.
- Badge **"Rascunho"** com fundo levemente mais escuro (contraste).
- Listagem: coluna **Status** volta para Vendedor · Status · Última alteração;
  coluna **Valor** após Cliente; **legenda** de status responsiva.

#### PDF

- Linhas **Desconto** e **Frete** só aparecem quando houver valor.
- Coluna **Código** em cor escura (legibilidade).

## [0.12.2] — 2026-07-07

### Sprint 2.7.6 — Ajustes pós-PDF (2ª rodada). Ver ADR-0225.

#### Configurações

- Novo campo **Inscrição Estadual** (layout `CNPJ | IE`).
- **UF** vira lista (sem texto livre).

#### Clientes

- **CPF/CNPJ** com rótulo e placeholder que acompanham o **Tipo de Pessoa**
  (o valor não é apagado ao trocar).

#### Propostas

- Listagem: **legenda das cores de status**, nova coluna **Valor** (Total da
  Proposta) e **badge de status ao lado da ação**.
- **Cancelada** passa a usar badge **vermelho**; o **motivo do cancelamento**
  aparece em destaque discreto abaixo do número da proposta.
- Não é possível **adicionar o mesmo produto duas vezes na mesma seção**
  (mensagem ao tentar); a referência continua válida em outras seções.
- **Frete** com a mesma experiência/alinhamento do campo **Desconto**.

#### Interface

- Placeholders mais apagados no **tema escuro** (padrão global).

#### PDF

- **Logo corrigido** — aparece no canto superior esquerdo (cabeçalho estático +
  logo embutido como data URI).
- Novo bloco **Observações da proposta**.
- Faixa dos **títulos de seção** em cinza médio (destaca do zebrado).
- Menos espaço entre **cabeçalho** e **bloco do cliente**.

## [0.12.1] — 2026-07-07

### Sprint 2.7.5 — Ajustes pós-PDF. Ver ADR-0224.

#### Configurações

- Máscara brasileira em **Telefone** e **WhatsApp**.
- **Logotipo por upload** (PNG/JPG, até 2 MB) no lugar do campo de URL — sem
  links externos. Preview no formulário; usado automaticamente no PDF.

#### Clientes

- **UF** vira lista com todas as unidades da federação.
- **RG** (PF) / **Inscrição Estadual** (PJ) — campo opcional (`CPF/CNPJ | RG/IE`,
  depois `Ativo`).

#### Proposta

- Autocomplete de produto mostra só **código + descrição** (sem o valor; lista
  mais limpa).
- **Quantidade** atualiza Total Produto/Serviço/Linha e o rodapé **em tempo
  real**, sem sair do campo.
- Larguras de Quantidade/Valor Produto/Valor Serviço reduzidas; **descrição em
  até 2 linhas** para caber sem rolagem horizontal.
- Campo de **Desconto** e sua interpretação em **uma única linha**.
- Valores padrão: **Forma de Pagamento = PIX**, **Previsão de Instalação =
  3 dias** (editáveis).

#### PDF

- Mais espaço entre as informações e a **área de assinaturas**.
- Alinhamento do valor no destaque do **TOTAL DA PROPOSTA**.
- "Validade" → **"Validade da proposta"**.
- Usa automaticamente o **logotipo** enviado nas Configurações.

## [0.12.0] — 2026-07-07

### Sprint 2.7 — Documento comercial (PDF). Ver ADR-0223.

#### Adicionado

- **Geração de PDF** da proposta (documento comercial premium) via
  `GET /propostas/[id]/pdf` (`@react-pdf/renderer`; sob demanda, sem armazenar;
  renderiza a revisão atual/emitida). "Gerar PDF" passa a abrir o documento;
  proposta emitida ganha o botão **"Abrir PDF"**.
- **Layout profissional (A4, múltiplas páginas):** cabeçalho limpo (logo +
  "PROPOSTA COMERCIAL" + nº + data); bloco do cliente elegante; tabela com
  **Descrição** dominante e **Código** discreto; **TOTAL DA PROPOSTA** em
  destaque; **Informações Comerciais** e **Observações** em blocos separados;
  área de **assinaturas** (Cliente / Consultor); rodapé com dados institucionais
  e **"Página X de Y"**.
- **Regras respeitadas:** na Simplificada, sem Valor/Total Serviços e sem
  Previsão de instalação; total da linha = Qtd × Valor Produto.
- **Paginação estável:** cabeçalhos do documento e da tabela repetidos por
  página; blocos de totais/observações/assinaturas não quebram; bandas de seção
  não ficam órfãs. Validado de 1 a 7+ páginas.
- **Arquitetura:** DTO puro (`proposta-pdf.mapper.ts`, testado) separado da IO;
  blocos de PDF próprios (sem reuso de componentes de tela); lógica financeira
  reutilizada de `totais.ts`. Fonte Inter (TTF em `public/fonts`).

#### Interno

- `vitest.config.ts` (alias `@/` → `src/`; exclui `e2e/`). Dependência
  `@react-pdf/renderer`.

## [0.11.0] — 2026-07-07

### Sprint 2.6.5 — Finalização da Proposta. Ver ADR-0222.

#### Adicionado

- **Finalização** abaixo da área de conteúdo (novo componente
  `FinalizacaoProposta`), com dois grupos: **Informações Comerciais** e
  **Observações**. Campos de **texto livre** pertencentes ao cabeçalho da
  Proposta — não interferem em cálculo/total/desconto/frete:
  - **Forma de pagamento** (linha).
  - **Previsão de instalação** (linha) — exibida **apenas no modelo Completa**;
    oculta na Simplificada (a informação continua armazenada).
  - **Observações comerciais** (multilinha).
  - **Observações técnicas** (multilinha).
- **Persistência aditiva:** colunas `formaPagamento`, `previsaoInstalacao`,
  `obsComerciais`, `obsTecnicas` na Proposta (migration
  `20260707060000_finalizacao`, `TEXT` nulo). Sem novas tabelas/entidades.
- **Smoke:** preenchimento + persistência (round-trip) dos quatro campos no
  modelo Completa; verificação de que a Previsão de instalação fica oculta na
  Simplificada.

## [0.10.0] — 2026-07-07

### Sprint 2.6 — Frete da Proposta. Ver ADR-0221.

#### Adicionado

- **Frete** no rodapé financeiro (entre Desconto e Total da Proposta), com
  máscara BRL (`CurrencyInput`; valor inicial **R$ 0,00**). Vale para Completa e
  Simplificada.
- **Total da Proposta = Subtotal − Desconto + Frete** (nunca negativo),
  recalculado em tempo real ao alterar itens, quantidades, valores, desconto ou
  frete — sem botão de recalcular.
- **Persistência:** `Proposta.frete` (Decimal, default 0). Migration aditiva
  `20260707050000_frete`. Subtotal e demais totais seguem derivados.
- **Regras:** frete ≥ 0 (sem limite máximo); a regra do desconto (≤ Subtotal)
  permanece.
- **Helper `totais.ts`** estendido (`calcularTotais` recebe `frete`) — mesma
  lógica financeira centralizada, sem duplicação.

## [0.9.0] — 2026-07-07

### Sprint 2.5 — Desconto da Proposta. Ver ADR-0220.

#### Adicionado

- **Campo de desconto inteligente** (único): digitar `500` = desconto em **valor**
  (R$ 500,00); acrescentar `%` (`10%`, `7,5%`) = **percentual**. Sem seletor; ao
  perder o foco, formata (R$/%). Placeholder "Ex.: 500 ou 10%" + texto de ajuda.
- **Rodapé:** passa a exibir **Subtotal · Desconto · Total da Proposta**
  (= Subtotal − Desconto, nunca negativo). Recalcula em tempo real a cada
  mutação; sem botão de recalcular.
- **Persistência (modelagem separada):** `Proposta.tipoDesconto`
  (VALOR|PERCENTUAL) + `valorDesconto` (Decimal) — nunca uma string. Migration
  aditiva `20260707040000_desconto`.
- **Regras:** desconto em valor ≥ 0 e ≤ Subtotal; percentual 0–100%. Na
  Simplificada o desconto incide sobre o Subtotal (só produtos).
- **Helper `totais.ts`** estendido (`aplicarDesconto`, `descontoAplicado`,
  `totalProposta`) — reutiliza a lógica da Sprint 2.4, sem duplicação.

## [0.8.0] — 2026-07-07

### Sprint 2.4 (parte 2) — Totais da Proposta. Ver ADR-0219.

Rodapé financeiro derivado dos itens em **tempo real**; **nada persistido** no
banco. Sem tabela/entidade/migração.

#### Adicionado

- **Rodapé de totais** abaixo da grade: **Total Produtos** (Σ Total Produto),
  **Total Serviços** (Σ Total Serviço) e **Subtotal** (Total Produtos + Total
  Serviços). Atualiza automaticamente a cada inclusão/remoção de item ou
  alteração de quantidade/valores (sem botão de recalcular). Valores à direita,
  máscara BRL.
- **Simplificada:** o rodapé oculta **Total Serviços** e o **Subtotal = Total
  Produtos** (valores de serviço seguem existindo internamente).
- **Utilitário `totais.ts`** (fonte única dos cálculos: `totalProdutoLinha`,
  `totalServicoLinha`, `totalLinha`, `calcularTotais`) reutilizado pela grade e
  pelo rodapé — preparado para Desconto/Frete/PDF.

#### Fora de escopo (próximas Sprints)

- Desconto, frete, total final, condições comerciais, PDF, impostos, custos,
  margem, lucro.

## [0.7.1] — 2026-07-07

### Sprint 2.4 (parte 1) — ajustes funcionais. Ver ADR-0218.

#### Alterado

- **Validade da proposta:** o campo do cabeçalho passa a se chamar **"Validade da
  proposta"** (em dias; será usado no PDF).
- **Máscara monetária (R$ 0,00):** os valores do item (Valor Produto / Valor
  Serviço) usam máscara BRL, reutilizando o `CurrencyInput` (armazenamento segue
  numérico; máscara é só de exibição).
- **Proposta Simplificada (apresentação):** a grade oculta **Valor Serviço**,
  **Total Produto** e **Total Serviço**; o **Total** vira Qtd × Valor Produto. Os
  valores de serviço **continuam armazenados** (nada excluído, modelo/snapshot
  intactos) — trocar para Completa reexibe tudo sem perda.

## [0.7.0] — 2026-07-07

### Sprint 2.3 — Serviços (Projeto de Automação) + Total da linha. Ver ADR-0215/0217.

Serviço **não** é entidade separada: o valor de serviço faz parte do cadastro do
**Produto**. **Sem migração** (o modelo já tinha os dois valores).

#### Adicionado

- Item da proposta passa a expor **Valor Produto** e **Valor Serviço**, ambos
  copiados do cadastro e **editáveis apenas na proposta** (snapshot; não altera o
  cadastro do Produto).
- **Totais por linha** (visuais): Total Produto (Qtd × Valor Produto), Total
  Serviço (Qtd × Valor Serviço) e Total da Linha (soma).
- Grade: **Código · Descrição · Qtd · UN · Valor Produto · Valor Serviço · Total
  Produto · Total Serviço · Total · Ações**; o diálogo de adicionar produto ganha
  os dois campos de valor.

#### Notas

- Um esboço inicial de "cadastro de Serviços separado" foi **revertido**; o banco
  de dev foi resetado (com autorização) ao estado das 4 migrations legítimas.
- **Não** foram criados: tabela `servicos`, CRUD/autocomplete/módulo de serviço,
  ou relação `servicoId`.

## [0.6.4] — 2026-07-07

### Edição por "Salvar Alterações" (pré-2.3). Ver ADR-0214.

#### Alterado

- **Proposta existente** deixa de ter **auto-save**: as alterações (cabeçalho,
  seções, produtos, observações) ficam **pendentes** até **"Salvar Alterações"**,
  que persiste tudo numa única transação. **Nova Proposta** permanece igual.
- **Revisão automática** passa a ocorrer **somente no salvamento**: se a proposta
  estava EMITIDA, "Salvar Alterações" cria a Rev.N+1, grava e volta a RASCUNHO.
  Nada de revisão durante a digitação.
- **Aviso ao sair** (voltar/fechar/navegar/atualizar) quando há alterações não
  salvas, reutilizando o `FormDirtyGuard` existente. "Gerar PDF" fica desabilitado
  enquanto houver pendências.

#### Interno

- Novo `salvarProposta` (substitui o conteúdo da revisão + auditoria consolidada);
  hook `useConteudoMemoria` reutilizado pelos dois workspaces. Removido o
  auto-save de conteúdo/cabeçalho (código morto): `ensureEditableRevision`,
  `updateCabecalho`, Server Actions de conteúdo e `serverConteudoActions`.

## [0.6.3] — 2026-07-07

### Homologação do fluxo de produtos (pré-2.3). Ver ADR-0213.

#### Adicionado

- **Autocomplete de produto** (busca por código/descrição, 3+ chars, teclado/
  mouse/Enter), via um `Autocomplete` genérico reutilizado também pelo Cliente.
- **Modelo Simplificada:** produtos entram **direto na proposta** (sem seções);
  Comercial mantém seções. Usa uma seção única implícita ("Produtos"), sem
  migração.
- **Coluna Total** por linha (Qtd × Valor Unitário, apenas visual).

#### Alterado

- **Grade de produtos** reordenada: Código · Descrição · Qtd · UN · Valor
  Unitário · Total · Ações.
- **Valor unitário editável** (no diálogo e na grade): vem do cadastro, é
  editável e grava no **snapshot** do item — não altera o cadastro do produto.
- **"Criar Proposta" exige cliente** (botão desabilitado + mensagem; validação no
  servidor).
- **Dashboard** de volta ao menu (placeholder); a home segue em Propostas.

## [0.6.2] — 2026-07-07

### Alterado

- **Workspace de criação:** o aviso "em memória" passa a usar o painel `Card`
  (componente existente), logo abaixo do cabeçalho, com título *"Esta proposta
  ainda não foi criada. Clique em 'Criar Proposta' para salvá-la."* e a descrição
  sobre não gravar/reservar número. Aparece apenas durante a criação; após
  "Criar Proposta" resta só o indicador de auto-save. Apenas UX.

## [0.6.1] — 2026-07-07

### Homologação do módulo de Propostas (ajustes pré-2.3). Ver ADR-0212.

#### Alterado

- **Criação diferida:** "Nova proposta" abre um workspace de **montagem em
  memória** (cabeçalho + seções + produtos); nada é gravado até **"Criar
  Proposta"**, que persiste tudo numa única transação (número, Rev.0, cabeçalho,
  conteúdo, auditoria). Fechar/cancelar antes ⇒ nada existe, **nenhum número
  consumido** (elimina lacunas por abandono).
- **Home = `/propostas`** (raiz e sidebar); item **Dashboard** removido da
  navegação (rota `/dashboard` removida).
- **Autocomplete de cliente** mostra o **documento** (CPF/CNPJ) em vez do tipo de
  pessoa.
- **Modelo da proposta** ocupa ~metade da linha.
- **Revisão única:** removido o rótulo "Conteúdo — Rev.N"; a revisão aparece uma
  vez, no título.

#### Interno

- Editor de conteúdo reutilizável via `ConteudoActions` (servidor vs memória);
  `criarPropostaCompleta`/`criarPropostaAction` transacional.

## [0.6.0] — 2026-07-07

### Refino do fluxo de Propostas (workspace-first + revisão automática)

Refatoração funcional do módulo antes de adicionar Serviços. Ver ADR-0211.

#### Adicionado

- **"Gerar PDF"** (`emitirProposta`): valida cliente + ≥1 item, emite
  (`EMITIDA` + `emitidaAt`) e **congela** a revisão (`PropostaRevisao.emittedAt`);
  auditoria `EMISSAO`. (O PDF binário fica para Sprint futura.)
- **Revisão automática:** editar uma proposta **emitida** cria sozinha a
  **Rev.N+1** (cópia profunda), volta a **RASCUNHO** e reaponta a revisão atual —
  via `ensureEditableRevision`, com **`idMap`** para reapontar seções/itens
  existentes. Sem botão "Nova Revisão".
- **Indicador de auto-save** e **aviso de proposta incompleta** (sem cliente) no
  workspace; foco automático no campo Cliente ao criar.

#### Alterado

- **Workspace único** (`/propostas/[id]`) para criar, editar e revisar. "Nova
  proposta" cria a proposta **já numerada** e abre o workspace direto. Cabeçalho
  editável inline com **auto-save por campo** (sem botão "Salvar").
- **Status** reduzido a **RASCUNHO · EMITIDA · CANCELADA**.
- `Proposta.clienteId` opcional (estado temporário de montagem; exigido na
  emissão).

#### Removido

- Rotas `/propostas/nova` e `/propostas/[id]/editar`; formulário isolado de
  cabeçalho; botões "Salvar" e "Nova Revisão"; status `APROVADA`/`REPROVADA` e
  colunas `aprovadaAt`/`reprovadaAt`.

## [0.5.1] — 2026-07-07

### Ajustes de UX + correção de perda de dados (pré-Sprint 2.3)

#### Corrigido

- **Perda de dados (crítico):** o seed executava `deleteMany()` nos cadastros e
  recriava só os exemplos, apagando registros manuais a cada `db:seed`. O seed
  passa a ser **não-destrutivo e idempotente**: nunca apaga; só popula em banco
  vazio; a Configuração é garantida sem sobrescrever (ADR-0209).

#### Alterado

- **Listagem de Propostas:** removidas as colunas **Validade** e **Modelo da
  proposta** (mantidas Número, Revisão, Cliente, Vendedor, Status, Última
  alteração, Ações). Filtros e paginação inalterados (ADR-0210).
- **Formulário de Proposta:** **Modelo da proposta** vira o **primeiro campo, em
  linha inteira**; ordem passa a Modelo → Cliente → Vendedor → Validade →
  Observações (ADR-0210).
- **Campo Cliente:** Select substituído por **autocomplete** com busca por Nome,
  Razão Social, CPF e CNPJ a partir de 3 caracteres (documento comparado sem
  máscara). O formulário não pré-carrega mais toda a lista de clientes (ADR-0210).

#### Adicionado

- `ClienteAutocompleteField` (primeiro componente de autocomplete do projeto) e
  `searchClientes` / `searchClientesAction`.

## [0.5.0] — 2026-07-07

### Sprint 2.2 — Seções + Produtos na Revisão (workspace)

A Proposta vira um **workspace**. Conteúdo comercial (seções + produtos) vive
dentro da revisão atual. **Sem** serviços, totais, cálculos, PDF ou preview.

#### Adicionado

- **Workspace** em `/propostas/[id]` (cabeçalho resumido + editor de conteúdo da
  revisão atual). Formulário de cabeçalho movido para `/propostas/[id]/editar`.
  "Editar" da listagem abre o workspace.
- **Seções** (agrupadores neutros) e **Produtos** dentro da revisão:
  adicionar/renomear/remover/reordenar (Mover ↑/↓); item de produto com
  **snapshot** (código/descrição/unidade/valores) + `produtoId` + quantidade
  (`Decimal(12,3)`, permite frações). Ordenação contígua (ADR-0208).
- **Nova revisão** e **duplicação** copiam **em profundidade** o conteúdo da
  revisão atual (ADR-0208).
- **Produto:** campo `unidade` (UN, MT, CX…); exclusão de produto usado em
  proposta **bloqueada** (ADR-0104 ativa / ADR-0207).
- Campo `tipo` (`PRODUTO`/`SERVICO`) já preparado no item para a próxima Sprint.
- Auditoria granular por operação de conteúdo; revisão histórica e proposta
  cancelada em **somente leitura** (`readOnly` no `CrudFormShell`).
- Componente reutilizável `NumberField`.
- Seed com conteúdo de exemplo; smoke test do workspace (seção + produto).
- ADRs 0207–0208; VERSION 0.5.0.

## [0.4.0] — 2026-07-07

### Sprint 2.1 — Fundação do Módulo de Propostas

Estrutura da proposta comercial. **Sem** produtos, serviços, seções, PDF,
preview, totais ou cálculos (próximas Sprints).

#### Adicionado

- **Modelagem** (migration aditiva, sem remodelar): enums `StatusProposta`,
  `MotivoCancelamento`, `EventoAuditoria`; novos campos na `Proposta` (status,
  `validadeDias`, `obsInternas`/`obsProposta`, datas de status,
  motivo/obs de cancelamento); tabela `PropostaAuditoria`.
- **Numeração sequencial** via sequência do PostgreSQL iniciando em **1001**
  (`proposalNumber` autoincrement); nunca reutilizada (ADR-0201).
- **CRUD de propostas**: criar (Rev.0, Rascunho, validade 5 dias), editar,
  **nova revisão**, **duplicar** (novo número, Rev.0, sem copiar obsInternas),
  **cancelar** (com motivo; sem excluir), **alterar status**.
- **Ciclo de vida** com transições validadas e **datas de status imutáveis**;
  **auditoria** gravada na mesma transação (ADR-0204).
- **Listagem** (`CrudLayout` + `useCrudList`): número, revisão, cliente, vendedor,
  modelo, status, validade, última alteração, ações; busca instantânea,
  ordenação, paginação e **filtro por status**. Badges de status pelo padrão
  ADR-0159.
- **Formulário** (`CrudFormShell`): cliente, vendedor, modelo, validade,
  observações internas/da proposta, status. Modo **somente leitura** quando
  cancelada.
- Componentes reutilizáveis novos: `NumberField`; `readOnly` no `CrudFormShell`.
- **Tipo** Comercial/Simplificada apenas persistido (ADR-0205).
- Seed com 3 propostas de exemplo; smoke test de propostas.
- ADRs 0201–0205; VERSION 0.4.0.

## [0.3.1] — 2026-07-07

### Sprint 1.5.1 — Ajustes finais

Ajustes de validação manual (sem novas funcionalidades).

#### Alterado

- **Configuração:** removidos da interface os campos **Cor Primária**, **Cor
  Secundária** e **Textos Institucionais** (não usados no projeto). A estrutura
  (colunas/DTO) permanece internamente para o futuro.
- **Badges — padrão oficial de cores (ADR-0159):** verde = Ativo/Sucesso,
  vermelho = Inativo/Erro, amarelo = Pendente/Atenção, azul = Informação/Em
  andamento. `StatusBadge`: **Ativo = verde**, **Inativo = vermelho** (aplicado
  em Clientes, Produtos e Vendedores).
- **Produtos — layout:** o helper "Pode ser zero" saiu da descrição (que
  desalinhava o grid) e foi para o rótulo do campo ("Valor do serviço (pode ser
  zero)"), mantendo todos os campos alinhados.

#### Corrigido

- **Clientes (listagem):** Pessoa Jurídica mostrava só a primeira letra. Agora a
  listagem escolhe o campo por `tipoPessoa` (**PJ → Empresa**, **PF → Nome**) e o
  service não grava o campo irrelevante (PJ não guarda `nome` órfão).
- **Produtos (código):** normalizado para **MAIÚSCULO** ao digitar e ao salvar;
  unicidade **case-insensitive** (`ABC001` = `abc001` = `AbC001`). Busca continua
  case-insensitive.

## [0.3.0] — 2026-07-06

### Sprint 1.5 — Polimento, UX e Preparação

Sprint de **qualidade** — nenhuma regra de negócio nova, nenhuma alteração de
banco. Fundação endurecida antes do módulo de Propostas.

#### Adicionado

- **Smoke tests com Playwright** (`e2e/`, `npm run test:e2e`): navegação e CRUD
  básico de Clientes contra a aplicação real; Chromium, execução serial.
- **Estrutura de impressão** `src/app/print.css` (importada no `globals.css`):
  `@page` A4, utilitários (`.no-print`, `.print-only`, `.print-avoid-break`,
  `.print-break-before`, `.print-page`) e regras `@media print` que ocultam o
  chrome — base para o futuro Preview HTML da proposta (Preview **não**
  implementado).
- **`FormSection`** — agrupador único de campos; formulários (Configuração,
  Clientes, Produtos, Vendedores) padronizados sobre ele.
- **`TableSkeleton`** — estado de carregamento das listagens com skeleton (usa o
  primitivo `Skeleton`), substituindo o spinner.
- **`/dev/diagnostics`** — página de diagnóstico **só em desenvolvimento**
  (tempo de conexão/consulta, versão do PostgreSQL, ambiente, status do Prisma,
  tempo de resposta). Não existe em produção (ADR-0156).
- Scripts `test:e2e` / `test:e2e:ui`.
- **Encerramento:** `docs/CHECKLIST_RELEASE.md` (gate obrigatório de Sprint) e
  `PROJECT_HISTORY.md` (histórico por Sprint); processo de release em ADR-0158.
- **Preparação da tela "About"** registrada (BACKLOG + PROJECT_CONTEXT) — sem
  implementar a tela.

#### Melhorado

- **Acessibilidade:** `aria-label` em busca, filtro "Mostrar inativos" e cabeçalho
  de ordenação; foco visível; navegação por teclado; ícones decorativos com
  `aria-hidden`. (Campos já expunham `aria-invalid`/`aria-describedby` via
  `FormControl`.)
- **Performance:** `React.memo` em componentes leaf (`StatusBadge`,
  `SortableHeader`); revisão confirmou seletores memoizados e consultas enxutas
  (ver DECISIONS.md ADR-0153).
- **Documentação:** README reescrito com trilhas separadas **Desenvolvimento** e
  **Publicação** (Windows Server 2019: deploy, atualização, backup, restore).
  READMEs de features/serviços atualizados (não mais "Sprint 0").

#### Removido

- Componentes superados/sem uso: `PageActions`, `PageSection`, `PageContainer`,
  `ui/scroll-area`; export morto `UNSAVED_CHANGES_MESSAGE`; slots placeholder e
  `TODO` antigos do header/logo.

#### Qualidade

- `npm run lint`, `npm run build`, `npm run typecheck` sem erros.
- Smoke tests do Playwright executados.

## [0.2.0] — 2026-07-06

### Sprint 1 — Cadastros Base

CRUD completo dos cadastros oficiais sobre **PostgreSQL real** (sem mocks).

#### Adicionado

- **Banco PostgreSQL nativo** como banco oficial do projeto, com **usuário
  dedicado** `outmat` (a aplicação nunca usa o superusuário `postgres`).
  Bootstrap em `scripts/db/bootstrap.sql` (`npm run db:bootstrap`). Docker
  passou a ser **opcional** (ambiente isolado). Ver `DECISIONS.md` (ADR-0101).
- **Camada de dados via Server Actions** (`"use server"`) → `services/` →
  Prisma, com retorno padronizado `ActionResult<T>` (ADR-0102).
- **CRUD completo**: Configuração do Sistema (singleton), Clientes, Produtos,
  Vendedores.
- **Listagens** padronizadas (`CrudListView` + `CrudLayout`): busca instantânea
  (qualquer parte do texto, sem acento), ordenação por coluna, paginação de
  20/pág, filtro "Mostrar inativos", ações por linha (Editar / Inativar /
  Excluir) — processadas no cliente (ADR-0103).
- **Formulários** padronizados (`CrudFormShell`): React Hook Form + Zod,
  autofocus no primeiro campo, atalhos **CTRL+S** (salvar) e **ESC** (cancelar),
  redirecionamento para a listagem + toast de sucesso ao salvar.
- **FormDirtyGuard** + `NavigationBlocker`: confirmação ao sair com alterações
  não salvas (links da aplicação via `onNavigate` + `beforeunload`).
- **Regras de exclusão/inativação**: Cliente e Vendedor não podem ser excluídos
  se usados em propostas (mensagem padrão → usar Inativar); Produto é excluível
  na Sprint 1 (sem relação com Proposta ainda — ADR-0104). Exclusão e inativação
  sempre pedem confirmação.
- **Validações**: CPF/CNPJ (dígitos verificadores), e-mail, campos obrigatórios,
  valores monetários (≥ 0). Regras condicionais do Cliente (PF exige `nome`, PJ
  exige `empresa`); `cpfCnpj` único quando informado.
- **Componentes**: primitivos `Textarea`, `Checkbox`, `Switch`, `Select`,
  `Form` (RHF), `Toaster` (sonner); campos `TextField`, `TextareaField`,
  `SelectField`, `SwitchField`, `CurrencyField`, `MaskedField`; `SortableHeader`,
  `RowActions`, `StatusBadge`; hooks `useCrudList`, `useFormShortcuts`.
- **Toasts** (sonner) em criar, editar, excluir, inativar e salvar.
- **`/api/health`**: verificação de saúde (app + conexão com o banco).
- **`VERSION`**, scripts padronizados no `package.json` (`typecheck`,
  `db:bootstrap`, `db:setup`, `db:up`/`db:down`), README revisado e novo
  `DECISIONS.md` (ADRs).
- Seed reescrito para o modelo real (produtos com código/valores; clientes PF e
  PJ com documentos válidos; configuração de exemplo).

#### Qualidade

- `npm run lint` sem erros.
- `npm run build` sem erros.
- CRUD validado contra PostgreSQL real (migrations + seed aplicados).

## [0.1.0] — 2026-07-06

### Sprint 0 — Fundação, Arquitetura e Planejamento

Fundação do projeto. **Nenhuma regra de negócio** foi implementada.

#### Adicionado

- Projeto Next.js 16 (App Router) com React 19 e TypeScript strict.
- Tailwind CSS v4 + shadcn/ui (preset Radix/Nova) + Lucide React.
- Arquitetura Clean Architecture + Feature-First (camadas `app`, `features`,
  `services`, `infrastructure` e transversais `lib`/`utils`/`types`/`hooks`).
- Infraestrutura:
  - Configuração de ambiente tipada e validada com Zod (fail-fast).
  - Resolução de caminhos de storage configuráveis e Windows-safe (sem criação
    de pastas).
  - Abstração de logging (`Logger` + `ConsoleLogger`).
  - Prisma Client singleton com driver adapter PostgreSQL.
- Prisma configurado (PostgreSQL) com 8 models **estruturais**: `Cliente`,
  `Produto`, `Vendedor`, `Proposta`, `PropostaRevisao`, `PropostaSecao`,
  `PropostaItem`, `ConfiguracaoSistema`; enum `ModeloProposta`.
- Migration inicial gerada offline (`prisma migrate diff`).
- Ajustes finais de modelagem: `Proposta.proposalNumber` (numeração comercial
  única), `Proposta.currentRevisionId` (revisão atual, 1:1 opcional) e
  `PropostaRevisao.revisionNumber` (inteiro; UI exibe "Rev.0").
- Seed de dados fictícios (5 clientes, 20 produtos, 3 vendedores).
- Layout base: Sidebar recolhível (off-canvas no mobile), Header, Breadcrumb,
  área principal; tema claro/escuro/sistema.
- Componentes base: `PageContainer`, `PageHeader`, `Section`, `Card` (ui),
  `DataTable`, `SearchInput`, `CurrencyInput`, `Loading`, `EmptyState`,
  `ConfirmDialog`, `ThemeToggle`, `Sidebar`, `Breadcrumb`.
- Utilitários: `formatCurrency`, `formatDate`, `formatCpfCnpj`, `formatPhone`
  (com testes em Vitest).
- 6 rotas placeholder (Dashboard, Propostas, Clientes, Produtos, Vendedores,
  Configurações), sem funcionalidades.
- Documentação: `PROJECT_CONTEXT.md`, `VISION.md`, `ARCHITECTURE.md`,
  `CHANGELOG.md`, `BACKLOG.md`.

#### Qualidade

- `npm run lint` sem erros.
- `npm run build` sem erros.
- `npm run test` — 11 testes passando.

[0.1.0]: #010--2026-07-06
