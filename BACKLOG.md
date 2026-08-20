# BACKLOG

> Vazio por design ao final da Sprint 0. Preenchido ao longo das Sprints.

## Apurado na Sprint 4.1 — Cadastro de Técnicos (2026-08-20)

- [ ] **Vendedor inativo desaparece do cabeçalho da Proposta** (prioridade média)
      **Contexto:** `getPropostaFormOptions()` (`src/services/proposta.service.ts`)
      filtra `where: { ativo: true }` sem unir o vendedor já vinculado. Uma
      proposta cujo vendedor foi inativado depois abre com o `Select` em branco,
      e salvar qualquer outra alteração apaga o vínculo em silêncio.
      **Apurado na Sprint 4.1**, ao desenhar o mesmo campo para Técnicos. A
      correção NÃO foi feita ali por estar fora do escopo aprovado.
      **Aceite:** o vendedor vinculado aparece na lista mesmo inativo, rotulado
      "(inativo)", como já faz `listTecnicoOptions` em `tecnico.service.ts`.
      **Não fazer:** remover o filtro de ativos — isso ofereceria inativos como
      opção nova, que é justamente o que a regra impede.

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
