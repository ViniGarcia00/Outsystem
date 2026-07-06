# Services (camada de aplicação)

Orquestração de casos de uso. É a **única** camada autorizada a acessar a
infraestrutura (Prisma, storage, logging). Componentes e páginas dependem de
services — nunca do Prisma diretamente.

```
app/ → features/ → services/ → infrastructure/
```

## Sprint 0

Vazio por design — nenhuma regra de negócio foi implementada. Os services de
cada domínio (clientes, produtos, propostas, etc.) serão adicionados nas
próximas Sprints, retornando `ActionResult<T>` (ver `src/types`).
