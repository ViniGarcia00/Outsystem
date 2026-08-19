# Feature: dashboard

Visão rápida da situação comercial e operacional (Sprint 4.0.3, ADR-0405).

```
dashboard.service.ts        IO (Prisma, 4 consultas em paralelo)
  → dashboard.ts            REGRA PURA — contagens, "próximas", ordem e corte
    → DashboardDTO
      → dashboard-view.tsx  apresentação apenas
```

- **`dashboard.ts` é onde mora a decisão** e por isso é onde estão os testes:
  quais status viram card, o que conta como próxima instalação, em que ordem e
  quantas. Sem banco, testável.
- **`dashboard-view.tsx` não calcula nada** e não escreve rótulo de status à mão
  — usa `features/instalacoes/labels.ts`.
- **Nada de dado fictício.** Tudo vem do banco.

Fora de escopo da V1: gráficos, comparativos mensais, metas, funil, receita,
margem, widgets configuráveis, filtros avançados, tempo real e dashboard por
usuário.

O Dashboard **não** depende do PDF Geral de Produtos, nem o contrário.
