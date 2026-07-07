# BACKLOG

> Vazio por design ao final da Sprint 0. Será preenchido nas próximas Sprints.

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
