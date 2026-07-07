# Biblioteca de componentes da aplicação (`@/components/app`)

Componentes de **alto nível** que definem o **padrão visual único** de todas as
telas. Construídos sobre os primitivos `@/components/ui` (shadcn) e
`@/components/shared`. Nenhuma regra de negócio vive aqui — apenas estrutura.

## Listagem (CRUD)

`CrudListView` monta uma listagem inteira a partir de props e reutiliza o
`CrudLayout`. A tela só fornece `columns`/`initialRows` e as Server Actions; o
componente cuida de busca instantânea, ordenação, paginação (20/pág), filtro
"Mostrar inativos", ações por linha (`RowActions`) e confirmações + toasts.

```tsx
<CrudListView
  title="Clientes"
  columns={columns}
  initialRows={rows}
  searchAccessor={(c) => `${c.nome} ${c.cpfCnpj}`}
  getId={(c) => c.id}
  getAtivo={(c) => c.ativo}
  onNew={() => router.push("/clientes/novo")}
  onEdit={(id) => router.push(`/clientes/${id}`)}
  listAction={listClientesAction}
  deleteAction={deleteClienteAction}
  toggleAtivoAction={toggleClienteAtivoAction}
/>
```

## Formulário (CRUD)

`CrudFormShell` é a moldura ÚNICA de formulário: `PageHeader` + formulário +
botões Salvar/Cancelar. Já integra React Hook Form, atalhos (CTRL+S / ESC),
`FormDirtyGuard` e confirmação ao cancelar com dados sujos.

## Componentes

| Componente       | Papel                                                        |
| ---------------- | ------------------------------------------------------------ |
| `AppPage`        | Moldura da tela (largura máx., respiro, ritmo vertical)       |
| `PageHeader`     | Título + descrição + ações                                   |
| `PageFilters`    | Barra de busca + filtros                                     |
| `PageContent`    | Região principal de conteúdo                                 |
| `PageTable`      | Tabela + loading (skeleton) + vazio + paginação             |
| `PageForm`       | Moldura de formulário (card + rodapé de ações)               |
| `PageEmpty`      | Estado vazio rico                                            |
| `PagePagination` | Controle de paginação (presentacional)                       |
| `CrudLayout`     | Listagem: título, busca, Novo, filtros, tabela, paginação    |
| `CrudListView`   | Listagem CRUD completa (busca/ordenação/paginação/ações)     |
| `CrudFormShell`  | Formulário CRUD padrão (RHF + atalhos + guarda)             |
| `RowActions`     | Ações por linha (Editar / Inativar / Excluir)               |
| `StatusBadge`    | Selo de status (Ativo / Inativo)                            |
