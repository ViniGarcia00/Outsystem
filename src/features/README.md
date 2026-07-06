# Features (Feature-First)

Cada feature é **auto-contida** e representa um domínio da aplicação. A estrutura
interna padrão de uma feature (a ser preenchida nas próximas Sprints) é:

```
features/<dominio>/
  components/   # componentes específicos da feature (UI da feature)
  hooks/        # hooks específicos da feature
  schemas/      # validação Zod (formulários, entrada de dados)
  services/     # casos de uso / acesso a dados via infraestrutura
  types/        # tipos do domínio
  index.ts      # API pública da feature (barrel)
```

## Regras de arquitetura

- A camada `app/` compõe telas a partir das features — **não** contém lógica.
- Componentes **não** acessam o Prisma diretamente: sempre via `services`.
- A feature expõe apenas o necessário pelo `index.ts` (encapsulamento).
- Dependências apontam para dentro: `app → features → services → infrastructure`.

## Sprint 0

Nesta Sprint as features existem **apenas como esqueletos** — nenhuma regra de
negócio foi implementada (proibido). Os diretórios abaixo são os pontos de
extensão das próximas Sprints:

- `dashboard/`
- `propostas/`
- `clientes/`
- `produtos/`
- `vendedores/`
- `configuracoes/`
