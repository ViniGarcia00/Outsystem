# BACKLOG

> Vazio por design ao final da Sprint 0. Preenchido ao longo das Sprints.

## Apurado na Sprint 4.6 — Módulo Pós-venda (2026-09-01)

> Os itens abaixo ficaram **explicitamente fora de escopo** por decisão da
> Sprint, não por esquecimento. O módulo entrou controlando o processo
> operacional — quem enviou, o que se espera de volta, o que voltou, quanto
> custou e o que foi consertado —, sem tocar em estoque, garantia ou financeiro.

### Fora de escopo por decisão (spec §43–§45, ADR-0418)

- [ ] **Estoque** (prioridade a definir)
      Baixa, reserva, entrada, movimentação e saldo. Nada disso acontece hoje:
      criar uma Troca ou uma OS **não move estoque**, e a quantidade devolvida é
      um registro operacional, não um lançamento.
      **Por que ficou fora:** estoque é um módulo próprio, com regras de custo
      médio, inventário e conciliação. Acoplá-lo ao Pós-venda faria a Troca
      carregar meia implementação de estoque — e a metade que falta é sempre a
      que quebra.

- [ ] **Número de série / rastreio por unidade** (prioridade a definir)
      Hoje o item é `produto + quantidade`. Não há como dizer *qual* das 7 peças
      voltou.
      **Quando vira necessidade:** no dia em que a análise de defeito recorrente
      precisar distinguir lote ou unidade. Depende de estoque.

- [ ] **Garantia** (prioridade a definir)
      Sem validação de prazo, sem cálculo de cobertura, sem entidade `Garantia`,
      sem exigência de NF. Quem decide se é garantia é a pessoa, e a decisão vai
      para a timeline como texto.

- [ ] **Financeiro / cobrança** (prioridade a definir)
      Os custos do Pós-venda são **informativos e operacionais**: não geram conta
      a pagar, conta a receber, cobrança, reembolso, baixa nem pagamento.
      **Atenção ao nome:** o status `VALOR_PENDENTE` da Troca é **operacional** —
      sinaliza que alguém precisa decidir o que fazer com um valor. Não é um
      título em aberto, e o sistema não o trata como tal.

- [ ] **Ordem de Serviço de INSTALAÇÃO** (prioridade a definir)
      A OS entregue é de **pós-venda / manutenção de equipamentos**. Uma OS de
      instalação é outro processo, e será outra entidade — nada no módulo atual
      a antecipa, de propósito (ADR-0418).

- [ ] **Pedido de Venda** (prioridade a definir)
      Continua fora do sistema, como desde o ADR-0400.

- [ ] **Cards de Pós-venda no Dashboard** (prioridade baixa)
      A Sprint não tocou no Dashboard por decisão explícita (spec §67). Quando
      entrar, os candidatos naturais são: trocas com devolução pendente, total
      pendente de retorno e OS abertas por status.

- [ ] **Relatórios gerenciais de Pós-venda** (prioridade baixa)
      Defeito recorrente por produto, tempo médio de retorno, custo por processo.
      O `produtoId` REAL já é preservado nos itens justamente para viabilizar
      isso depois (ADR-0418) — mas nenhuma tela agrega nada hoje.

### Decisões de desenho que podem ser afrouxadas depois

- [ ] **Múltiplas OS por Troca** (prioridade média)
      Hoje a cardinalidade é **zero ou uma**, garantida pelo `@unique` em
      `pos_venda_ordens_servico."trocaAntecipadaId"` (ADR-0419).
      **Quando vira necessidade:** uma troca de 7 interruptores em que as peças
      são analisadas em lotes separados, por técnicos diferentes.
      **Custo de mudar:** `DROP INDEX` do unique — migration aditiva, sem perda
      de dados —, mais o ajuste de `TrocaAntecipada.ordemServico` de 0..1 para
      1:N, do DTO e da listagem. A regra do service (`TROCA_JA_TEM_OS`) sai
      junto.

- [ ] **Sincronização Troca → OS** (prioridade baixa — e provavelmente NUNCA)
      A OS recebe um **snapshot** dos produtos devolvidos no momento da criação
      (ADR-0419). Mudar a Troca depois não altera a OS, e **não existe código de
      sincronização** — nem desligado, nem atrás de flag.
      **Registrado aqui como aviso, não como pendência:** "sincronizar" parece
      uma melhoria até alguém perceber que a OS passou a mentir sobre o que
      efetivamente chegou para análise. Se um dia for pedido, precisa ser decisão
      de produto explícita, não refatoração.

- [ ] **Custos de Troca e OS não se somam em lugar nenhum** (prioridade baixa)
      São históricos independentes (spec §36). Se algum dia alguém quiser "quanto
      custou este problema por inteiro", isso é um **relatório novo** que soma os
      dois agregados na leitura — nunca uma coluna, nunca uma cópia de custo.

- [ ] **A grade de produtos da Troca não valida no formulário** (prioridade baixa)
      A validação de linha (`devolvida ≤ esperada`, XOR de identificação) roda no
      **service**, e o erro chega por toast. Na tela há um aviso imediato de
      "devolvido maior que o esperado", mas não é uma validação de campo do React
      Hook Form.
      **Por que ficou assim:** a grade é estado local controlado, como o
      `CustosEditor` das Instalações, e o projeto não usa `useFieldArray` em
      lugar nenhum. Introduzir um segundo padrão de array em formulário custaria
      mais do que a mensagem por toast custa hoje.

- [ ] **Categoria de custo é uma enum só para os dois submódulos**
      (prioridade baixa)
      A separação entre custos de ENVIO (Troca) e de REPARO (OS) é da interface,
      não do banco (ADR-0418). Um chamador que forjasse a Server Action
      conseguiria gravar `PECA` numa Troca — seria um custo classificado de forma
      estranha, nada além disso. Endurecer no schema exigiria dois schemas de
      registro para ganhar uma garantia que o `Select` já dá.

## Apurado na Sprint 4.5 — Anexos Word/Excel e tabela de Instalações (2026-08-31)

- [ ] **Validação de anexo é por MIME declarado, não por conteúdo**
      (prioridade baixa — limitação conhecida, ACEITA por decisão explícita)
      **Contexto:** a allowlist decide pelo `file.type` que o navegador envia.
      `application/vnd.ms-excel` é o que alguns ambientes Windows reportam para
      arquivos que **não** são XLS estrito — CSV inclusive. Um arquivo assim
      seria aceito e guardado com extensão `.xls`, conteúdo intacto.
      **Por que não é um furo hoje:** nada é executado, nada escapa da raiz de
      uploads (`resolveWithin`), o nome físico é gerado no servidor e o
      `Content-Type` servido é sempre derivado da allowlist, com `nosniff`. O
      pior caso é um arquivo guardado com a extensão errada.
      **Por que não foi tratado na 4.5:** inspeção de magic bytes ou parser de
      Office trariam dependência nova e um modo de falha novo — arquivo legítimo
      recusado por assinatura inesperada — para um risco que o resto da
      arquitetura já contém. Ver ADR-0417.

- [ ] **Ordenação do Apelido é textual, inclusive no valor de fallback**
      (prioridade baixa)
      **Contexto:** a listagem ordena pelo texto exibido, que pode ser o apelido,
      o nome do cliente ou o número. Uma instalação sem apelido ordena, portanto,
      pelo nome do cliente — que é o comportamento desejado, e é por isso que
      isto **não** é bug. Fica registrado apenas porque a leitura "ordena por
      `Instalacao.apelido`" é intuitiva e está errada.
      **Só vira trabalho** se alguém pedir ordenação no banco: aí o fallback
      precisaria virar SQL, e hoje não precisa. Ver ADR-0417.

## Apurado na Sprint 4.4 — Contrato Rev. 4 (2026-08-28)

- [ ] **Campos comerciais de cabeçalho não são históricos** (prioridade alta —
      dívida ARQUITETURAL, registrada por decisão explícita do dono do produto)
      **Contexto:** o conteúdo comercial (seções, itens, snapshot de produto) vive
      na `PropostaRevisao` e sobrevive intacto a um fork. Mas **desconto, frete,
      forma de pagamento, previsão de instalação** e os três campos contratuais
      criados nesta Sprint (`prazoExecucaoDiasUteis`, `valorParcelaFinal`,
      `observacoesAceite`) vivem na **`Proposta`** e são **sobrescritos** quando a
      revisão seguinte nasce. Ou seja: a proposta guarda o **estado corrente**
      desses campos, não o que foi enviado ao cliente na revisão N.
      **Por que não gera documento errado hoje:** só existe rota para gerar
      documento da **revisão atual**. O dia em que existir "regenerar o documento
      da revisão 2", ela sairá com o desconto e o prazo de **hoje**.
      **Por que não foi corrigido aqui:** mover esses campos para a revisão é
      remodelagem de dados com migration de backfill, e a Sprint 4.4 foi aprovada
      para versionar o template e ativar a Rev. 4 — misturar as duas coisas
      tornaria impossível dizer qual mudança quebrou o quê.
      **Regra até lá:** nenhuma documentação do projeto pode afirmar que "todos os
      dados comerciais de uma revisão são imutáveis". Ver ADR-0415.

- [ ] **Contrato só pode ser gerado da revisão atual** (prioridade baixa)
      **Contexto:** `templateContratoVersao` já torna possível regenerar o
      contrato de uma revisão antiga com o texto jurídico da época — a informação
      está gravada. Falta a rota e a interface. Depende do item acima: sem os
      campos de cabeçalho na revisão, regenerar o antigo entregaria o texto certo
      com números errados.

## Apurado na Sprint 4.1 — Cadastro de Técnicos (2026-08-20)

- [x] **Vendedor inativo desaparece do cabeçalho da Proposta** (prioridade média)
      **Contexto:** `getPropostaFormOptions()` (`src/services/proposta.service.ts`)
      filtrava `where: { ativo: true }` sem unir o vendedor já vinculado. Uma
      proposta cujo vendedor foi inativado depois abria com o `Select` em branco,
      e salvar qualquer outra alteração apagava o vínculo em silêncio.
      **Apurado na Sprint 4.1**, ao desenhar o mesmo campo para Técnicos. A
      correção NÃO foi feita ali por estar fora do escopo aprovado.
      **FECHADO na Sprint 4.2 (ADR-0410).** `listUsuarioOptions(papel,
      incluirIds)` devolve disponíveis ∪ vinculado, e o vinculado indisponível
      aparece rotulado — `(inativo)` ou `(sem papel de vendedor)`, conforme a
      causa. A correção foi consequência mecânica da unificação dos dois Selects:
      manter o débito exigiria escrever a versão defeituosa de propósito.
      O filtro de ativos **não** foi removido — inativo não vinculado continua
      fora da lista, que é o que a regra sempre exigiu.

## Apurado na auditoria da Release 1.1.0 (2026-08-18)

Itens levantados durante a reconciliação documental. **Nada aqui foi
implementado** — o ciclo 1.1.0 foi exclusivamente documental/processual.

### Testes

- [ ] **Smoke E2E acoplado ao conteúdo do catálogo** (prioridade alta)
      **Contexto:** `e2e/smoke.spec.ts` preenche o autocomplete com códigos de
      produto fixos. As linhas 136, 149 e 342 usam `"RTR"`, que vem do catálogo
      **fictício** de `prisma/seed.ts` (`RTR-001`). Desde `ee0db73` (2026-07-10) o
      banco de desenvolvimento é restaurado de `backup/db_outsystem.backup` — o
      catálogo **real** da Outmat (22 produtos `OM*`/`CM10`), sem nenhum `RTR`.
      Os três testes falham. A linha 274 usa `"CM10"` e passa. Verificado em
      consulta ao banco: `codigo ILIKE 'RTR%'` → nenhum resultado.
      **Não é regressão** da 1.1.0 — o débito é de 10/07; o teste novo da Sprint
      3.1 (b) já nasceu usando `CM10`.
      **Aceite:** o smoke deixa de depender de um código específico. O teste cria
      o próprio produto (como já faz com o cliente, via `Date.now()`) ou
      seleciona a primeira opção que o autocomplete oferecer.
      **Não fazer:** trocar `"RTR"` por `"CM10"` — é workaround; mantém o
      acoplamento e quebra de novo no próximo restore do banco.

- [ ] **Ampliar a cobertura E2E**
      **Contexto:** hoje o smoke cobre navegação, CRUD de Clientes, fluxo de
      proposta, Simplificada e os documentos. Falta Produtos, Vendedores e
      Configuração.

### Rotas de documento

- [ ] **Guard 400 para proposta sem itens** (ADR-0330, fora de escopo deliberado)
      **Contexto:** a UI protege (`podeEmitir` exige cliente + item), mas o acesso
      direto a `/contrato`, `/pdf` ou `/presentation` de uma proposta vazia
      responde 200 com "R$ 0,00". Comportamento herdado, não regressão.
      **Aceite:** as três rotas respondem 400 quando a proposta não tem itens,
      como `/presentation` já faz para o modelo Simplificada. Resolve junto o
      quirk do `extenso(0)` → "zero centavos".

### Processo

- [ ] **Formalizar (ou não) o merge em `main` como critério de conclusão**
      **Contexto:** `docs/CHECKLIST_RELEASE.md` exige commit (item 13), não merge.
      Não há ADR sobre o assunto e o repositório não tem merge commits — até a
      Sprint 3.1 (b) o trabalho ia direto na `main`. `sprint-3.1` inaugurou o
      modelo de branch.
      **Aceite:** decidir e registrar em ADR. Se a resposta for sim, acrescentar
      o item ao gate.

- [ ] **ADRs retroativos para as Sprints 2.9.x e 2.10.x**
      **Contexto:** sete ciclos entregaram nova entidade (`PropostaServico` +
      migration), mudança de regra financeira (desconto sobre o total combinado),
      dois documentos novos e a parametrização do PDF por variante — **sem
      nenhum ADR**. `DECISIONS.md` salta de ADR-0228 para ADR-0300.
      **Aceite:** ADRs registrando ao menos a modelagem dos serviços
      complementares e a mudança da regra do desconto. É reconstrução
      arquitetural, merece ciclo próprio — não entrou na 1.1.0.

- [ ] **Atualizar `README.md` e `VISION.md`**
      **Contexto:** o item 10 do gate ("Documentação atualizada") não fecha.
      `ARCHITECTURE.md` e `PROJECT_CONTEXT.md` foram atualizados na 1.1.0;
      `README.md` está na Sprint 2.3 e `VISION.md` na Sprint 1.
      **Aceite:** `VISION.md` com as regras de serviços complementares e do
      desconto sobre o total combinado; `README.md` com as trilhas e os quatro
      documentos.

### Infraestrutura

- [ ] **Busca server-side escalável** (a avaliar — aberto na Sprint 4.0.3)
      **Contexto:** o `contains + mode: "insensitive"` do Prisma vira `ILIKE` no
      PostgreSQL — insensível a caixa, **sensível a acento**. Provado no banco de
      dev: `ILIKE '%thai%'` devolvia 0 e `ILIKE '%thaí%'` devolvia 1 (o cliente
      "Thaís Sales de Sousa"). A Sprint 4.0.3 (ADR-0402) passou o filtro textual
      dos autocompletes de Clientes, Produtos e Propostas para memória, usando
      `normalizarBusca` de `src/utils/busca.ts`. O conjunto é carregado **sem
      `take`** de propósito: qualquer limite antes do filtro esconderia um
      registro válido além do corte, que é justamente o defeito corrigido.
      Adequado ao volume atual (91 clientes, 49 produtos, 28 propostas), com
      debounce de 250 ms e mínimo de 3 caracteres — e só os campos da sugestão
      são selecionados.
      **Aceite:** empurrar o filtro para o banco sem perder a insensibilidade a
      acento. Três caminhos, em ordem de preferência: índice funcional sobre
      expressão normalizada (`lower(unaccent(nome))`); coluna sombra normalizada
      mantida pelo service; ou `unaccent` com o privilégio resolvido no
      `scripts/db/bootstrap.sql`.
      **Gatilho:** milhares de clientes ou produtos ativos, ou latência
      perceptível no autocomplete. **Não fazer antes disso** — seria otimização
      sem problema medido.
      **Bloqueio conhecido:** `CREATE EXTENSION unaccent` exige superusuário e o
      ADR-0101 determina que a aplicação use o usuário dedicado `outmat`, que não
      é superusuário. Qualquer caminho com `unaccent` precisa resolver isso no
      bootstrap, executado por quem tem o privilégio, não pela aplicação.

- [ ] **`.env` usa o superusuário `postgres`** (segurança)
      **Contexto:** `.env.development` e `.env` apontam
      `postgresql://postgres:...@localhost:5432/db_outsystem`, contradizendo o
      comentário do próprio arquivo (*"A aplicação NUNCA usa o superusuário
      postgres"*) e o ADR-0101, que criou o usuário dedicado `outmat`.
      Introduzido em `ee0db73`. Além disso `.env.development` e `.env.production`
      **estão versionados com senha em texto claro**.
      **Aceite:** voltar ao usuário `outmat` e tirar os `.env` com credencial do
      versionamento. **Decisão de infraestrutura — não tocado na 1.1.0.**

## Backlog Futuro (Homologação v1.0.0 — Sprint 2.8)

Oportunidades de melhoria **identificadas durante a homologação** do módulo de
Propostas. **Nada aqui foi implementado** (a Sprint 2.8 não adiciona
funcionalidades) — são sugestões para versões/módulos posteriores. O módulo de
Propostas está encerrado em **1.0.0**; as próximas evoluções ocorrem em módulos
independentes (a começar por **"PDF Projeto"**).

### UX / Interface

- **Barra de ações fixa (sticky) no workspace da proposta** — os botões ficam na
  parte inferior; em propostas longas é preciso rolar até o fim para salvar.
  (Identificado na 2.7.7.)
- **Contraste do placeholder nos Selects (tema escuro)** — a regra global cobre
  `input`/`textarea`; o placeholder do `Select` (Radix) não foi ajustado.
  (Identificado na 2.7.6.)
- **Recálculo do total do desconto em tempo real** — a interpretação já é
  ao vivo, mas o total só recalcula no blur. (Identificado na 2.7.7/2.7.8.)

### PDF Comercial

- **Cabeçalho compacto a partir da página 2** — hoje o cabeçalho (com logo) é
  estático e repete igual; um compacto exigiria pré-carregar a imagem de outra
  forma (o @react-pdf não embute imagem dentro de `render`). (Identificado na
  2.7.6.)
- **Formatos de logo** — o PDF embute apenas **PNG/JPG** (limitação do
  @react-pdf); SVG/WebP exigiriam conversão no upload. (Identificado na 2.7.5.)
- **Nome do Projeto no PDF** — o campo existe na Proposta (2.7.8) mas não é
  exibido no documento.

### Dados / Operação

- **Seed idempotente por entidade** — o seed é global-idempotente (ADR-0209); se
  só um cadastro faltar no dev, `db:seed` não o repovoa (tudo-ou-nada).
  (Identificado na 2.7.5.)

### Já entregues (dos itens abaixo, durante as Sprints 2.x)

- **Upload real do logo da Configuração** — entregue na 2.7.5 (ADR-0224).
- **Preview/geração do documento comercial** — entregue como **PDF Comercial**
  via `@react-pdf/renderer` na 2.7 (ADR-0223), no lugar do preview HTML sobre
  `print.css`.
- **Relação Produto × Proposta + regra de exclusão** — item de proposta passou a
  referenciar `produtoId` com `onDelete: Restrict` (produto usado não é
  excluído).

---

## Como usar

Cada item deve conter: contexto, critério de aceite e a Sprint alvo.

Formato sugerido:

```
- [ ] <título>  (Sprint X)
      Contexto: ...
      Aceite: ...
```

## Itens

- [ ] **Relação Produto × Proposta + regra de exclusão** (Sprint de Propostas)
      Contexto: na Sprint 1 o Produto não tem vínculo com Proposta e é excluível.
      Aceite: ao criar `produtoId` nos itens de proposta, aplicar a checagem de
      uso em `ProdutoService.remove` (mesma regra de Cliente/Vendedor).

- [ ] **Upload real do logo da Configuração** (Sprint futura)
      Contexto: hoje `logo` é apenas texto/URL.
      Aceite: upload de arquivo para `UPLOAD_PATH`/storage, guardando o caminho;
      preview no formulário.

- [ ] **Paginação server-side (se necessário)** (a avaliar)
      Contexto: listagens são client-side (busca instantânea) — adequado ao
      volume atual.
      Aceite: se algum cadastro crescer para milhares de registros, migrar
      busca/ordenação/paginação para o service (skip/take/where/orderBy).

- [ ] **Máscara/validação de CEP e busca por CEP** (a avaliar)
      Contexto: endereço é texto livre.
      Aceite: máscara de CEP e, opcionalmente, preenchimento automático.

- [ ] **Preview HTML da proposta sobre `print.css`** (Sprint de Propostas)
      Contexto: a base de impressão (`print.css`, `.print-page`) já existe.
      Aceite: renderizar a proposta na "folha" A4 e permitir impressão/PDF.

- [ ] **Tela "About" (Sobre)** (Sprint futura)
      Contexto: preparação registrada na Sprint 1.5 (estrutura, sem tela).
      Aceite: uma tela que exibe Versão do Sistema, Build, Última atualização,
      Versão do Banco, PostgreSQL, Prisma, Next.js, Ambiente, Health e
      Diagnostics. Pode reutilizar `diagnostics.service.ts` (versão do PostgreSQL,
      ambiente) + `VERSION` + versões do `package.json`. Diferente de
      `/dev/diagnostics`: a About é para o usuário final e existe também em
      produção (sem dados sensíveis de infraestrutura).

- [ ] **Ampliar cobertura de testes E2E** (contínuo)
      Contexto: hoje há apenas smoke tests (navegação + CRUD básico de Clientes).
      Aceite: adicionar fluxos de Produtos/Vendedores/Configuração e casos de
      validação conforme o sistema evolui.

- [ ] **Fail-fast na conexão do banco (opcional)** (endurecimento)
      Contexto: quando a instância do PostgreSQL trava, as requisições ficam
      penduradas (ver DECISIONS.md ADR-0157).
      Aceite: configurar `connectionTimeoutMillis` no pool do adapter para que a
      app responda 503 rápido (ex.: `/api/health`) em vez de travar. Não aplicado
      na Sprint 1.5 para evitar mudança de comportamento não solicitada.

- [ ] **[Infra dev] Conflito de porta 5432 no ambiente local** (ambiente)
      Contexto: há dois PostgreSQL disputando a 5432 na máquina de dev (nativo +
      container `kanban-postgres`), o que adiciona latência (~6s) por consulta no
      dev server. Não é defeito do projeto.
      Aceite: manter apenas um servidor na 5432 (parar o container concorrente ou
      usar portas distintas) para respostas instantâneas em desenvolvimento.
