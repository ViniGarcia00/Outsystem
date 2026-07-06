# Biblioteca de componentes da aplicação (`@/components/app`)

Componentes de **alto nível** que definem o **padrão visual único** de todas as
telas. Construídos sobre os primitivos `@/components/ui` (shadcn) e
`@/components/shared`. Nenhuma regra de negócio vive aqui — apenas estrutura.

## Anatomia de uma tela

```tsx
import {
  AppPage, PageHeader, PageFilters, PageContent, PageSection,
  PageTable, PageForm, PageEmpty, PageActions,
} from "@/components/app";

<AppPage>
  <PageHeader title="Clientes" description="..." actions={<PageActions onNew={...} />} />
  <PageFilters searchValue={q} onSearchChange={setQ} />
  <PageContent>
    <PageTable columns={columns} data={data} empty={<PageEmpty ... />} pagination={...} />
  </PageContent>
</AppPage>
```

## Componentes

| Componente     | Papel                                                        |
| -------------- | ------------------------------------------------------------ |
| `AppPage`      | Moldura da tela (largura máx., respiro, ritmo vertical)       |
| `PageHeader`   | Título + descrição + ações                                   |
| `PageActions`  | Botões padrão (Novo/Salvar/Cancelar/Excluir/Duplicar/Exportar) |
| `PageFilters`  | Barra de busca + filtros + ações                             |
| `PageContent`  | Região principal de conteúdo                                 |
| `PageSection`  | Subseção com título/descrição                                |
| `PageTable`    | Tabela + loading + vazio + paginação                         |
| `PageForm`     | Moldura de formulário (card + rodapé de ações)               |
| `PageEmpty`    | Estado vazio rico                                            |
| `PagePagination` | Controle de paginação (presentacional)                     |
| `CrudLayout`   | Layout CRUD completo (título, busca, Novo, tabela, paginação, vazio) |

## CRUD padrão

`CrudLayout` monta uma tela de listagem inteira a partir de props. A tela só
fornece `columns`/`data` e reage aos callbacks (`onSearchChange`, `onNew`,
`pagination.onPageChange`). Ele não busca, filtra nem persiste nada.
