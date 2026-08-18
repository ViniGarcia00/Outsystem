# Sprint 4.0.2 — Cronologia e Custos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o módulo de Instalações com a cronologia operacional — cada acontecimento como um registro independente, com responsável manual, relatório e custos extras — e os totais derivados por registro e por instalação.

**Architecture:** `InstalacaoRegistro` (1 instalação → N registros) e `InstalacaoCusto` (1 registro → N custos), sempre escritos em `prisma.$transaction`. O cálculo vive num módulo puro (`custos.ts`), espelhando `features/propostas/totais.ts`; nenhum total é persistido. A infraestrutura de datas da 4.0.1 (`datas.ts`) é **estendida** com helpers de data-hora, compartilhando a mesma timezone fixa. O placeholder de Cronologia do workspace dá lugar à timeline real.

**Tech Stack:** Next.js 16.2.10 (App Router), React 19, TypeScript strict, Prisma 7 + PostgreSQL, Zod 4, React Hook Form, Vitest 4, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-18-sprint4-0-instalacoes-design.md` (decisões D12–D17)

## Global Constraints

- **Responsável é TEXTO LIVRE e OBRIGATÓRIO** no registro. Proibido criar usuário, login, responsável operacional, FK para `Vendedor` ou FK para qualquer pessoa. O nome é snapshot histórico.
- **`datas.ts` é ESTENDIDO, nunca duplicado (D12).** Proibido criar um segundo módulo de datas. Os helpers de data-hora compartilham a constante `FUSO_BRASIL` do arquivo existente.
- **Proibido alterar `src/utils/format/date.ts`.** O `formatDateTime` compartilhado não fixa timezone e é usado por Propostas; o fuso fixo de `aconteceuEm` vive em `datas.ts`.
- **Timeline ordena por `aconteceuEm` desc**, com `createdAt` desc como desempate (D13). Nunca só por `createdAt`.
- **Fatos históricos são permitidos** — sem validação de piso em `aconteceuEm`. Há teto: não pode ser futuro.
- **Nenhum total é persistido.** Sem `totalRegistro`, sem `custoExtraTotal` no banco.
- **Monetário nunca é `float` no banco:** `Decimal @db.Decimal(12, 2)`. Valor de custo **estritamente maior que zero**.
- **Cronologia NÃO gera auditoria técnica (D17).** Criar, editar ou excluir registro não escreve em `InstalacaoAuditoria`.
- **Exclusão (D16):** registro sem custos pode ser excluído; **com custos, bloqueado** com mensagem orientando editar. A checagem é do **service** — o `onDelete: Cascade` do banco apagaria os custos, e é exatamente o que a regra impede.
- **Componente nunca importa Prisma.** Fluxo `app/` → `features/` → `services/` → `infrastructure/`.
- **`VERSION` só muda no fechamento desta Sprint**, para `1.2.0`, junto do gate de release.
- **Nada do módulo Comercial é alterado.** Proibido tocar `proposta*.ts`, `totais.ts`, documentos ou template do Contrato. Nada de Pedido de Venda ou Ordem de Serviço.
- **Antes de usar qualquer API do Next.js**, consultar `node_modules/next/dist/docs/`.
- Ao final: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` e `npm run test:e2e` sem erros.

---

## File Structure

**Criar:**

| Arquivo | Responsabilidade |
|---|---|
| `prisma/migrations/20260819000000_instalacao_cronologia/migration.sql` | Enums + tabelas de registro e custo |
| `src/features/instalacoes/custos.ts` | Cálculo puro dos totais |
| `src/features/instalacoes/custos.test.ts` | Testes do cálculo |
| `src/features/instalacoes/registro-schema.ts` | Schemas Zod do registro e dos custos |
| `src/features/instalacoes/registro-schema.test.ts` | Testes de validação |
| `src/features/instalacoes/registro-actions.ts` | Server Actions do registro |
| `src/features/instalacoes/cronologia.tsx` | Timeline |
| `src/features/instalacoes/registro-card.tsx` | Card de um acontecimento |
| `src/features/instalacoes/registro-dialog.tsx` | Criar/editar registro + custos |
| `src/features/instalacoes/custos-editor.tsx` | Linhas de custo dentro do diálogo |
| `src/features/instalacoes/resumo-custos.tsx` | Total acumulado + por categoria |
| `src/services/instalacao-registro.service.ts` | Casos de uso, transações |

**Modificar:**

| Arquivo | Mudança |
|---|---|
| `prisma/schema.prisma` | + 2 enums, + 2 models, + relação inversa em `Instalacao` |
| `src/features/instalacoes/datas.ts` | + 4 helpers de data-hora (D12) |
| `src/features/instalacoes/datas.test.ts` | + testes dos helpers novos |
| `src/features/instalacoes/labels.ts` | + rótulos de tipo de registro e categoria de custo |
| `src/features/instalacoes/instalacao-workspace.tsx` | Placeholder → timeline + resumo + botão |
| `src/services/instalacao.service.ts` | `getInstalacao` carrega registros e custos |
| `src/features/instalacoes/index.ts` | + exports |
| `e2e/instalacoes.spec.ts` | + cenário completo da cronologia |
| `DECISIONS.md`, `CHANGELOG.md`, `PROJECT_HISTORY.md`, `ARCHITECTURE.md`, `PROJECT_CONTEXT.md`, `VISION.md`, `VERSION` | Fechamento do módulo em 1.2.0 |

---

## Task 1: Schema e migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260819000000_instalacao_cronologia/migration.sql`

**Interfaces:**
- Consumes: model `Instalacao` da 4.0.1.
- Produces: models `InstalacaoRegistro` e `InstalacaoCusto`; enums `TipoRegistroInstalacao` e `CategoriaCustoInstalacao`.

- [ ] **Step 1: Acrescentar os enums ao `schema.prisma`**

Logo após o enum `EventoInstalacao`:

```prisma
/// Tipo do acontecimento na cronologia operacional (Sprint 4.0.2).
enum TipoRegistroInstalacao {
  VISITA_CLIENTE
  ATUALIZACAO_INTERNA
  MATERIAL_COMPRADO
  ALTERACAO_ESCOPO
  PENDENCIA
  CONCLUSAO
  OUTRO
}

/// Categoria do custo extra do acontecimento (Sprint 4.0.2).
enum CategoriaCustoInstalacao {
  MATERIAL
  MAO_DE_OBRA
  DESLOCAMENTO
  TERCEIROS
  FRETE
  OUTROS
}
```

- [ ] **Step 2: Acrescentar os models**

Ao final do arquivo, depois de `InstalacaoAuditoria`:

```prisma
/// Acontecimento da cronologia operacional (Sprint 4.0.2).
///
/// É CONTEÚDO escrito pelos responsáveis, não trilha de sistema — não confundir
/// com InstalacaoAuditoria (ADR-0401). Criar, editar ou excluir um registro NÃO
/// gera entrada de auditoria.
model InstalacaoRegistro {
  id String @id @default(cuid())

  instalacaoId String
  instalacao   Instalacao @relation(fields: [instalacaoId], references: [id], onDelete: Cascade)

  tipo TipoRegistroInstalacao

  /// Quando o fato OCORREU. Pode ser anterior à criação da instalação (fatos
  /// históricos são permitidos). A timeline ordena por este campo.
  aconteceuEm DateTime

  /// Texto livre OBRIGATÓRIO. Snapshot histórico — NUNCA vira FK.
  responsavel String

  relatorio String @db.Text

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  custos InstalacaoCusto[]

  @@index([instalacaoId, aconteceuEm])
  @@map("instalacao_registros")
}

/// Custo extra pertencente a um acontecimento (Sprint 4.0.2).
/// Custo interno operacional: NÃO altera a Proposta nem gera cobrança.
model InstalacaoCusto {
  id String @id @default(cuid())

  registroId String
  registro   InstalacaoRegistro @relation(fields: [registroId], references: [id], onDelete: Cascade)

  categoria CategoriaCustoInstalacao
  descricao String?
  /// Sempre > 0 (validado no Zod e no service). Nunca float.
  valor     Decimal @db.Decimal(12, 2)

  createdAt DateTime @default(now())

  @@index([registroId])
  @@map("instalacao_custos")
}
```

- [ ] **Step 3: Acrescentar a relação inversa em `Instalacao`**

Junto de `auditorias InstalacaoAuditoria[]`:

```prisma
  registros InstalacaoRegistro[]
```

- [ ] **Step 4: Escrever a migration**

Criar `prisma/migrations/20260819000000_instalacao_cronologia/migration.sql`:

```sql
-- Sprint 4.0.2 — Cronologia e custos das Instalações.
-- Aditiva: nenhuma tabela existente muda além do lado inverso da relação.
--
-- InstalacaoRegistro é a cronologia OPERACIONAL (conteúdo escrito pelos
-- responsáveis); InstalacaoAuditoria, criada na 4.0.1, continua sendo a trilha
-- TÉCNICA. Os dois mecanismos não se misturam (ADR-0401).
--
-- Nenhum total é persistido: totalRegistro e totalInstalacao são derivados.

-- CreateEnum
CREATE TYPE "TipoRegistroInstalacao" AS ENUM ('VISITA_CLIENTE', 'ATUALIZACAO_INTERNA', 'MATERIAL_COMPRADO', 'ALTERACAO_ESCOPO', 'PENDENCIA', 'CONCLUSAO', 'OUTRO');

-- CreateEnum
CREATE TYPE "CategoriaCustoInstalacao" AS ENUM ('MATERIAL', 'MAO_DE_OBRA', 'DESLOCAMENTO', 'TERCEIROS', 'FRETE', 'OUTROS');

-- CreateTable
CREATE TABLE "instalacao_registros" (
    "id" TEXT NOT NULL,
    "instalacaoId" TEXT NOT NULL,
    "tipo" "TipoRegistroInstalacao" NOT NULL,
    "aconteceuEm" TIMESTAMP(3) NOT NULL,
    "responsavel" TEXT NOT NULL,
    "relatorio" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instalacao_registros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instalacao_custos" (
    "id" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "categoria" "CategoriaCustoInstalacao" NOT NULL,
    "descricao" TEXT,
    "valor" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instalacao_custos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "instalacao_registros_instalacaoId_aconteceuEm_idx" ON "instalacao_registros"("instalacaoId", "aconteceuEm");

-- CreateIndex
CREATE INDEX "instalacao_custos_registroId_idx" ON "instalacao_custos"("registroId");

-- AddForeignKey
ALTER TABLE "instalacao_registros" ADD CONSTRAINT "instalacao_registros_instalacaoId_fkey" FOREIGN KEY ("instalacaoId") REFERENCES "instalacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instalacao_custos" ADD CONSTRAINT "instalacao_custos_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "instalacao_registros"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 5: Aplicar e regenerar**

```bash
npm run db:migrate:deploy
npm run db:generate
npm run typecheck
```

Esperado: migration aplicada, client regenerado, typecheck sem erros.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260819000000_instalacao_cronologia
git commit -m "feat(instalacoes): schema e migration da cronologia e custos"
```

---

## Task 2: Data-hora — estender `datas.ts`

**NÃO criar módulo novo.** Os helpers entram no arquivo existente, reusando a
constante `FUSO_BRASIL` (D12).

**Files:**
- Modify: `src/features/instalacoes/datas.ts`
- Modify: `src/features/instalacoes/datas.test.ts`

**Interfaces:**
- Consumes: `FUSO_BRASIL` já declarado no arquivo.
- Produces:
  - `dataHoraDeInput(valor: string): Date | null`
  - `dataHoraParaInput(data: Date | null | undefined): string`
  - `ehDataHoraDeInputValida(valor: string): boolean`
  - `dataHoraParaExibicao(data: Date): string`

- [ ] **Step 1: Escrever os testes falhando**

Acrescentar ao final de `src/features/instalacoes/datas.test.ts` (e incluir os
quatro nomes novos no `import` do topo do arquivo):

```ts
describe("dataHoraDeInput", () => {
  it("converte YYYY-MM-DDTHH:mm preservando a hora", () => {
    const d = dataHoraDeInput("2026-08-18T16:40");
    expect(d).toBeInstanceOf(Date);
    expect(dataHoraParaInput(d)).toBe("2026-08-18T16:40");
  });

  it("NAO ancora ao meio-dia — a hora do fato é preservada", () => {
    // A data pura é ancorada ao meio-dia; a data-hora não pode ser.
    expect(dataHoraParaInput(dataHoraDeInput("2026-08-18T00:05"))).toBe(
      "2026-08-18T00:05",
    );
    expect(dataHoraParaInput(dataHoraDeInput("2026-08-18T23:55"))).toBe(
      "2026-08-18T23:55",
    );
  });

  it("devolve null para vazio e formato inválido", () => {
    expect(dataHoraDeInput("")).toBeNull();
    expect(dataHoraDeInput("18/08/2026 16:40")).toBeNull();
    expect(dataHoraDeInput("2026-08-18")).toBeNull();
  });
});

describe("dataHoraParaInput", () => {
  it("formata no fuso de São Paulo, não no do servidor", () => {
    // 01:00 UTC de 19/08 é 22:00 de 18/08 em São Paulo.
    expect(dataHoraParaInput(new Date("2026-08-19T01:00:00Z"))).toBe(
      "2026-08-18T22:00",
    );
  });

  it("devolve vazio para null e data inválida", () => {
    expect(dataHoraParaInput(null)).toBe("");
    expect(dataHoraParaInput(new Date("nada"))).toBe("");
  });
});

describe("dataHoraParaExibicao", () => {
  it("formata dd/mm/aaaa HH:mm no fuso de São Paulo", () => {
    expect(dataHoraParaExibicao(dataHoraDeInput("2026-08-18T16:40")!)).toBe(
      "18/08/2026 16:40",
    );
  });

  it("não depende do fuso do runtime", () => {
    expect(dataHoraParaExibicao(new Date("2026-08-19T01:00:00Z"))).toBe(
      "18/08/2026 22:00",
    );
  });
});

describe("ehDataHoraDeInputValida", () => {
  it("recusa vazio — aconteceuEm é obrigatório", () => {
    expect(ehDataHoraDeInputValida("")).toBe(false);
  });

  it("aceita o formato do input", () => {
    expect(ehDataHoraDeInputValida("2026-08-18T16:40")).toBe(true);
  });

  it("recusa formato inválido", () => {
    expect(ehDataHoraDeInputValida("2026-08-18")).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar para verificar que falha**

```bash
npm test -- src/features/instalacoes/datas.test.ts
```

Esperado: FAIL — os quatro helpers não existem.

- [ ] **Step 3: Implementar**

Acrescentar ao final de `src/features/instalacoes/datas.ts`:

```ts
// ---------------------------------------------------------------------------
// Data-hora (Sprint 4.0.2) — `aconteceuEm` da cronologia
// ---------------------------------------------------------------------------
//
// Mesma infraestrutura da data pura acima: mesmo fuso fixo, mesma filosofia.
// UMA diferença deliberada: a data pura é ancorada ao meio-dia para o dia não
// virar na conversão; aqui a hora é informação real do fato e é preservada como
// foi digitada.

/** "YYYY-MM-DD HH:mm" no fuso de São Paulo (sv-SE usa esse formato). */
const formatadorDataHora = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Sao_Paulo",
});

const formatadorExibicao = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Sao_Paulo",
});

/** "YYYY-MM-DDTHH:mm" -> `Date` no fuso de São Paulo, ou `null`. */
export function dataHoraDeInput(valor: string): Date | null {
  const v = valor.trim();
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00${FUSO_BRASIL}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `Date` -> "YYYY-MM-DDTHH:mm" para `<input type="datetime-local">`. */
export function dataHoraParaInput(data: Date | null | undefined): string {
  if (!data) return "";
  const d = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(d.getTime())) return "";
  // sv-SE produz "YYYY-MM-DD HH:mm"; o input exige "T" no lugar do espaço.
  return formatadorDataHora.format(d).replace(" ", "T");
}

/** `aconteceuEm` é OBRIGATÓRIO: vazio é inválido. */
export function ehDataHoraDeInputValida(valor: string): boolean {
  return dataHoraDeInput(valor) !== null;
}

/**
 * "18/08/2026 16:40" no fuso de São Paulo.
 *
 * Não usar o `formatDateTime` de `@/utils`: ele não fixa timezone (usa a do
 * runtime) e é compartilhado com Propostas — alterá-lo mudaria aquele módulo.
 */
export function dataHoraParaExibicao(data: Date): string {
  const d = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(d.getTime())) return "";
  return formatadorExibicao.format(d).replace(", ", " ");
}
```

- [ ] **Step 4: Rodar os testes**

```bash
npm test -- src/features/instalacoes/datas.test.ts
```

Esperado: PASS (12 existentes + 11 novos = 23). Os separadores produzidos pelo
`Intl` variam entre runtimes — se `dataHoraParaExibicao` falhar por causa do
`replace(", ", " ")`, ajuste conforme a saída **do teste**, não por suposição.

- [ ] **Step 5: Commit**

```bash
git add src/features/instalacoes/datas.ts src/features/instalacoes/datas.test.ts
git commit -m "feat(instalacoes): estende datas.ts com data-hora para aconteceuEm"
```

---

## Task 3: Cálculo puro dos custos

**Files:**
- Create: `src/features/instalacoes/custos.ts`
- Create: `src/features/instalacoes/custos.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type CategoriaCustoInstalacao` e `const CATEGORIAS_CUSTO`
  - `interface CustoCalculavel { categoria: CategoriaCustoInstalacao; valor: number }`
  - `interface RegistroCalculavel { custos: ReadonlyArray<CustoCalculavel> }`
  - `totalDoRegistro(custos): number`
  - `totalDaInstalacao(registros): number`
  - `totaisPorCategoria(registros): Record<CategoriaCustoInstalacao, number>`

- [ ] **Step 1: Escrever os testes falhando**

Criar `src/features/instalacoes/custos.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  totaisPorCategoria,
  totalDaInstalacao,
  totalDoRegistro,
} from "./custos";

const custo = (valor: number, categoria = "MATERIAL" as const) => ({
  categoria,
  valor,
});

describe("totalDoRegistro", () => {
  it("registro SEM custos soma zero", () => {
    expect(totalDoRegistro([])).toBe(0);
  });

  it("registro com UM custo devolve o próprio valor", () => {
    expect(totalDoRegistro([custo(80)])).toBe(80);
  });

  it("registro com VÁRIOS custos soma todos", () => {
    expect(totalDoRegistro([custo(340), custo(35, "FRETE")])).toBe(375);
  });

  it("soma valores quebrados sem erro de ponto flutuante", () => {
    expect(totalDoRegistro([custo(0.1), custo(0.2)])).toBe(0.3);
  });
});

describe("totalDaInstalacao", () => {
  it("soma os custos de todos os registros", () => {
    // Cenário de homologação da spec: 80 + (340 + 35) + 0 = 455.
    expect(
      totalDaInstalacao([
        { custos: [custo(80, "DESLOCAMENTO")] },
        { custos: [custo(340), custo(35, "FRETE")] },
        { custos: [] },
      ]),
    ).toBe(455);
  });

  it("instalação sem registros soma zero", () => {
    expect(totalDaInstalacao([])).toBe(0);
  });

  it("instalação só com registros sem custo soma zero", () => {
    expect(totalDaInstalacao([{ custos: [] }, { custos: [] }])).toBe(0);
  });
});

describe("totaisPorCategoria", () => {
  it("agrupa por categoria somando entre registros", () => {
    const t = totaisPorCategoria([
      { custos: [custo(230), custo(80, "DESLOCAMENTO")] },
      { custos: [custo(75), custo(80, "DESLOCAMENTO")] },
    ]);
    expect(t.MATERIAL).toBe(305);
    expect(t.DESLOCAMENTO).toBe(160);
  });

  it("categorias sem lançamento ficam zeradas", () => {
    const t = totaisPorCategoria([{ custos: [custo(100)] }]);
    expect(t.FRETE).toBe(0);
    expect(t.TERCEIROS).toBe(0);
    expect(t.MAO_DE_OBRA).toBe(0);
    expect(t.OUTROS).toBe(0);
  });

  it("a soma das categorias bate com o total da instalação", () => {
    const registros = [
      { custos: [custo(230), custo(80, "DESLOCAMENTO")] },
      { custos: [custo(75), custo(150, "MAO_DE_OBRA")] },
    ];
    const soma = Object.values(totaisPorCategoria(registros)).reduce(
      (a, b) => a + b,
      0,
    );
    expect(soma).toBe(totalDaInstalacao(registros));
  });
});
```

- [ ] **Step 2: Rodar para verificar que falha**

```bash
npm test -- src/features/instalacoes/custos.test.ts
```

Esperado: FAIL — `Failed to resolve import "./custos"`.

- [ ] **Step 3: Implementar**

Criar `src/features/instalacoes/custos.ts`:

```ts
/**
 * Custos extras da Instalação (Sprint 4.0.2) — FONTE ÚNICA de cálculo.
 *
 * Nenhum total é persistido (ADR-0219): tudo é derivado dos custos lançados nos
 * registros da cronologia. A interface apenas apresenta o que sai daqui — não
 * existe soma espalhada por componente.
 *
 * Custos são INTERNOS e operacionais: não alteram a Proposta, não recalculam
 * total comercial e não geram cobrança.
 *
 * Módulo PURO — testado sem banco.
 */

export type CategoriaCustoInstalacao =
  | "MATERIAL"
  | "MAO_DE_OBRA"
  | "DESLOCAMENTO"
  | "TERCEIROS"
  | "FRETE"
  | "OUTROS";

export const CATEGORIAS_CUSTO: CategoriaCustoInstalacao[] = [
  "MATERIAL",
  "MAO_DE_OBRA",
  "DESLOCAMENTO",
  "TERCEIROS",
  "FRETE",
  "OUTROS",
];

export interface CustoCalculavel {
  categoria: CategoriaCustoInstalacao;
  valor: number;
}

export interface RegistroCalculavel {
  custos: ReadonlyArray<CustoCalculavel>;
}

/**
 * Arredonda a 2 casas. Um total de custos agrega N linhas independentes e o
 * erro de ponto flutuante acumula (0.1 + 0.2 = 0.30000000000000004). É um
 * endurecimento local desta Sprint; `features/propostas/totais.ts` soma direto
 * e NÃO é alterado.
 */
const c2 = (valor: number): number => Math.round(valor * 100) / 100;

export function totalDoRegistro(
  custos: ReadonlyArray<CustoCalculavel>,
): number {
  return c2(custos.reduce((soma, c) => soma + c.valor, 0));
}

export function totalDaInstalacao(
  registros: ReadonlyArray<RegistroCalculavel>,
): number {
  return c2(registros.reduce((soma, r) => soma + totalDoRegistro(r.custos), 0));
}

export function totaisPorCategoria(
  registros: ReadonlyArray<RegistroCalculavel>,
): Record<CategoriaCustoInstalacao, number> {
  const totais = Object.fromEntries(
    CATEGORIAS_CUSTO.map((c) => [c, 0]),
  ) as Record<CategoriaCustoInstalacao, number>;

  for (const registro of registros) {
    for (const custo of registro.custos) {
      totais[custo.categoria] = c2(totais[custo.categoria] + custo.valor);
    }
  }
  return totais;
}
```

- [ ] **Step 4: Rodar os testes**

```bash
npm test -- src/features/instalacoes/custos.test.ts
```

Esperado: PASS (10 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/instalacoes/custos.ts src/features/instalacoes/custos.test.ts
git commit -m "feat(instalacoes): cálculo puro dos custos extras"
```

---

## Task 4: Rótulos de tipo e categoria

**Files:**
- Modify: `src/features/instalacoes/labels.ts`

**Interfaces:**
- Consumes: `type CategoriaCustoInstalacao` de `./custos` (Task 3) — **não redeclarar**.
- Produces: `TipoRegistroInstalacao`, `TIPO_REGISTRO_LABEL`, `TIPOS_REGISTRO_ORDER`, `CATEGORIA_CUSTO_LABEL`.

- [ ] **Step 1: Acrescentar ao `labels.ts`**

```ts
import type { CategoriaCustoInstalacao } from "./custos";

export type TipoRegistroInstalacao =
  | "VISITA_CLIENTE"
  | "ATUALIZACAO_INTERNA"
  | "MATERIAL_COMPRADO"
  | "ALTERACAO_ESCOPO"
  | "PENDENCIA"
  | "CONCLUSAO"
  | "OUTRO";

export const TIPO_REGISTRO_LABEL: Record<TipoRegistroInstalacao, string> = {
  VISITA_CLIENTE: "Visita ao cliente",
  ATUALIZACAO_INTERNA: "Atualização interna",
  MATERIAL_COMPRADO: "Material comprado",
  ALTERACAO_ESCOPO: "Alteração de escopo",
  PENDENCIA: "Pendência",
  CONCLUSAO: "Conclusão",
  OUTRO: "Outro",
};

/** Ordem de exibição no seletor — do mais frequente ao genérico. */
export const TIPOS_REGISTRO_ORDER: TipoRegistroInstalacao[] = [
  "VISITA_CLIENTE",
  "ATUALIZACAO_INTERNA",
  "MATERIAL_COMPRADO",
  "ALTERACAO_ESCOPO",
  "PENDENCIA",
  "CONCLUSAO",
  "OUTRO",
];

export const CATEGORIA_CUSTO_LABEL: Record<CategoriaCustoInstalacao, string> = {
  MATERIAL: "Material",
  MAO_DE_OBRA: "Mão de obra",
  DESLOCAMENTO: "Deslocamento",
  TERCEIROS: "Terceiros",
  FRETE: "Frete",
  OUTROS: "Outros",
};
```

- [ ] **Step 2: Typecheck e commit**

```bash
npm run typecheck
git add src/features/instalacoes/labels.ts
git commit -m "feat(instalacoes): rótulos de tipo de registro e categoria de custo"
```

---

## Task 5: Schemas de validação do registro

**Files:**
- Create: `src/features/instalacoes/registro-schema.ts`
- Create: `src/features/instalacoes/registro-schema.test.ts`

**Interfaces:**
- Consumes: `dataHoraDeInput` e `ehDataHoraDeInputValida` (Task 2); `requiredText` de `@/lib/validation`.
- Produces: `custoSchema`, `registroSchema`, `CustoValues`, `RegistroValues`.

- [ ] **Step 1: Escrever os testes falhando**

Criar `src/features/instalacoes/registro-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { registroSchema } from "./registro-schema";

const base = {
  tipo: "VISITA_CLIENTE" as const,
  aconteceuEm: "2026-08-18T10:00",
  responsavel: "Carlos",
  relatorio: "Realizada vistoria inicial.",
  custos: [],
};

describe("registroSchema", () => {
  it("aceita registro sem custos", () => {
    expect(registroSchema.safeParse(base).success).toBe(true);
  });

  it("aceita registro com um custo", () => {
    const r = registroSchema.safeParse({
      ...base,
      custos: [{ categoria: "DESLOCAMENTO", descricao: "", valor: 80 }],
    });
    expect(r.success).toBe(true);
  });

  it("aceita registro com vários custos de categorias diferentes", () => {
    const r = registroSchema.safeParse({
      ...base,
      custos: [
        { categoria: "MATERIAL", descricao: "2 módulos", valor: 340 },
        { categoria: "FRETE", descricao: "", valor: 35 },
      ],
    });
    expect(r.success && r.data.custos).toHaveLength(2);
  });

  it("REJEITA custo com valor zero", () => {
    const r = registroSchema.safeParse({
      ...base,
      custos: [{ categoria: "MATERIAL", descricao: "", valor: 0 }],
    });
    expect(r.success).toBe(false);
  });

  it("REJEITA custo com valor negativo", () => {
    const r = registroSchema.safeParse({
      ...base,
      custos: [{ categoria: "MATERIAL", descricao: "", valor: -10 }],
    });
    expect(r.success).toBe(false);
  });

  it("REJEITA responsável vazio", () => {
    expect(
      registroSchema.safeParse({ ...base, responsavel: "   " }).success,
    ).toBe(false);
  });

  it("REJEITA relatório vazio", () => {
    expect(registroSchema.safeParse({ ...base, relatorio: "   " }).success).toBe(
      false,
    );
  });

  it("REJEITA aconteceuEm vazio — é obrigatório", () => {
    expect(registroSchema.safeParse({ ...base, aconteceuEm: "" }).success).toBe(
      false,
    );
  });

  it("PERMITE acontecimento histórico (data no passado)", () => {
    expect(
      registroSchema.safeParse({ ...base, aconteceuEm: "2020-01-05T08:30" })
        .success,
    ).toBe(true);
  });

  it("REJEITA acontecimento no futuro", () => {
    const amanha = new Date(Date.now() + 48 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16);
    expect(
      registroSchema.safeParse({ ...base, aconteceuEm: amanha }).success,
    ).toBe(false);
  });

  it("aceita descrição de custo vazia (é opcional)", () => {
    const r = registroSchema.safeParse({
      ...base,
      custos: [{ categoria: "OUTROS", descricao: "", valor: 12.5 }],
    });
    expect(r.success).toBe(true);
  });

  it("recusa tipo desconhecido", () => {
    expect(
      registroSchema.safeParse({ ...base, tipo: "INVENTADO" }).success,
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar para verificar que falha**

```bash
npm test -- src/features/instalacoes/registro-schema.test.ts
```

Esperado: FAIL — `Failed to resolve import "./registro-schema"`.

- [ ] **Step 3: Implementar**

Criar `src/features/instalacoes/registro-schema.ts`:

```ts
import { z } from "zod";

import { requiredText } from "@/lib/validation";

import { dataHoraDeInput, ehDataHoraDeInputValida } from "./datas";

/**
 * Schemas do registro da cronologia (Sprint 4.0.2).
 *
 * Responsável é TEXTO LIVRE e OBRIGATÓRIO (ADR-0400/0401): não existe cadastro,
 * então a validação é apenas "não vazio".
 *
 * A data-hora permanece como texto do `<input type="datetime-local">` — a
 * conversão para `Date` é da Server Action, pelo mesmo motivo da 4.0.1:
 * transformar aqui faria o tipo de entrada divergir do de saída, e o React Hook
 * Form manipula o de entrada.
 */

const TIPOS = [
  "VISITA_CLIENTE",
  "ATUALIZACAO_INTERNA",
  "MATERIAL_COMPRADO",
  "ALTERACAO_ESCOPO",
  "PENDENCIA",
  "CONCLUSAO",
  "OUTRO",
] as const;

const CATEGORIAS = [
  "MATERIAL",
  "MAO_DE_OBRA",
  "DESLOCAMENTO",
  "TERCEIROS",
  "FRETE",
  "OUTROS",
] as const;

export const custoSchema = z.object({
  categoria: z.enum(CATEGORIAS),
  descricao: z.string().trim().max(200, "Máximo de 200 caracteres."),
  /** Estritamente maior que zero: custo zerado não é custo. */
  valor: z
    .number({ message: "Informe um valor válido." })
    .positive("O valor deve ser maior que zero."),
});

export const registroSchema = z.object({
  tipo: z.enum(TIPOS),
  aconteceuEm: z
    .string()
    .trim()
    .refine(ehDataHoraDeInputValida, "Informe a data e a hora do acontecimento.")
    // Fatos históricos são permitidos; fatos futuros, não — ainda não ocorreram.
    .refine((v) => {
      const d = dataHoraDeInput(v);
      return d !== null && d.getTime() <= Date.now();
    }, "O acontecimento não pode estar no futuro."),
  responsavel: requiredText("Responsável", 120),
  relatorio: requiredText("Relatório", 5000),
  custos: z.array(custoSchema),
});

export type CustoValues = z.infer<typeof custoSchema>;
export type RegistroValues = z.infer<typeof registroSchema>;
```

- [ ] **Step 4: Rodar os testes**

```bash
npm test -- src/features/instalacoes/registro-schema.test.ts
```

Esperado: PASS (12 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/instalacoes/registro-schema.ts src/features/instalacoes/registro-schema.test.ts
git commit -m "feat(instalacoes): schemas de validação do registro e dos custos"
```

---

## Task 6: Service da cronologia

**Files:**
- Create: `src/services/instalacao-registro.service.ts`
- Modify: `src/services/instalacao.service.ts`

**Interfaces:**
- Consumes: `prisma`; `type CategoriaCustoInstalacao` de `@/features/instalacoes/custos`; `type TipoRegistroInstalacao` de `@/features/instalacoes/labels`.
- Produces:
  - `interface CustoDTO` / `interface RegistroDTO`
  - `interface CustoInput` / `interface RegistroInput`
  - `mapRegistro(linha): RegistroDTO`
  - `listarRegistros(instalacaoId): Promise<RegistroDTO[]>`
  - `criarRegistro(instalacaoId, input): Promise<{ id: string }>`
  - `atualizarRegistro(id, input): Promise<void>`
  - `excluirRegistro(id): Promise<void>`
  - `ORDEM_TIMELINE`, `INCLUDE_CUSTOS`, `REGISTRO_NAO_ENCONTRADO`, `REGISTRO_COM_CUSTOS`
- Também: `InstalacaoDetalhe` ganha `registros: RegistroDTO[]`.

- [ ] **Step 1: Tipos, constantes e mapper**

Criar `src/services/instalacao-registro.service.ts` com o cabeçalho e os tipos:

```ts
import type { CategoriaCustoInstalacao } from "@/features/instalacoes/custos";
import type { TipoRegistroInstalacao } from "@/features/instalacoes/labels";
import { prisma } from "@/infrastructure/database";

/**
 * Cronologia operacional da Instalação (Sprint 4.0.2).
 *
 * - Registro + custos são escritos numa ÚNICA transação: falhou um custo, o
 *   registro não permanece.
 * - Na edição, os custos usam delete-and-recreate dentro da transação — mesmo
 *   padrão de PropostaServico em `proposta.service.ts`.
 * - NENHUM total é persistido: o cálculo é do módulo puro `custos.ts`.
 * - Estas operações NÃO gravam InstalacaoAuditoria (ADR-0401): cronologia
 *   operacional e trilha técnica são mecanismos separados.
 */

export interface CustoDTO {
  id: string;
  categoria: CategoriaCustoInstalacao;
  descricao: string | null;
  valor: number;
}

export interface RegistroDTO {
  id: string;
  tipo: TipoRegistroInstalacao;
  aconteceuEm: Date;
  responsavel: string;
  relatorio: string;
  createdAt: Date;
  custos: CustoDTO[];
}

export interface CustoInput {
  categoria: CategoriaCustoInstalacao;
  descricao: string;
  valor: number;
}

export interface RegistroInput {
  tipo: TipoRegistroInstalacao;
  aconteceuEm: Date;
  responsavel: string;
  relatorio: string;
  custos: CustoInput[];
}

export const REGISTRO_NAO_ENCONTRADO = "Registro não encontrado.";

/** Mensagem oficial do bloqueio de exclusão (ADR-0401). */
export const REGISTRO_COM_CUSTOS =
  "Este registro possui custos lançados e não pode ser excluído. " +
  "Edite o registro para corrigir os custos.";

const trimOrNull = (v?: string | null): string | null => {
  const t = v?.trim();
  return t ? t : null;
};

const toNumber = (v: { toString(): string }): number => Number(v.toString());

/**
 * Ordenação da timeline: aconteceuEm desc, createdAt desc como desempate.
 * Ordenar por createdAt colocaria um registro criado hoje acima de um fato de
 * ontem — exatamente o caso que a spec exige tratar.
 */
export const ORDEM_TIMELINE = [
  { aconteceuEm: "desc" as const },
  { createdAt: "desc" as const },
];

/** Custos de um registro sempre na ordem em que foram lançados. */
export const INCLUDE_CUSTOS = {
  custos: { orderBy: { createdAt: "asc" as const } },
} as const;

type LinhaRegistro = {
  id: string;
  tipo: string;
  aconteceuEm: Date;
  responsavel: string;
  relatorio: string;
  createdAt: Date;
  custos: {
    id: string;
    categoria: string;
    descricao: string | null;
    valor: { toString(): string };
  }[];
};

export function mapRegistro(r: LinhaRegistro): RegistroDTO {
  return {
    id: r.id,
    tipo: r.tipo as TipoRegistroInstalacao,
    aconteceuEm: r.aconteceuEm,
    responsavel: r.responsavel,
    relatorio: r.relatorio,
    createdAt: r.createdAt,
    custos: r.custos.map((c) => ({
      id: c.id,
      categoria: c.categoria as CategoriaCustoInstalacao,
      descricao: c.descricao,
      valor: toNumber(c.valor),
    })),
  };
}

export async function listarRegistros(
  instalacaoId: string,
): Promise<RegistroDTO[]> {
  const rows = await prisma.instalacaoRegistro.findMany({
    where: { instalacaoId },
    orderBy: ORDEM_TIMELINE,
    include: INCLUDE_CUSTOS,
  });
  return rows.map(mapRegistro);
}
```

- [ ] **Step 2: Escrita transacional**

Acrescentar ao mesmo arquivo:

```ts
export async function criarRegistro(
  instalacaoId: string,
  input: RegistroInput,
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    const criado = await tx.instalacaoRegistro.create({
      data: {
        instalacaoId,
        tipo: input.tipo,
        aconteceuEm: input.aconteceuEm,
        responsavel: input.responsavel.trim(),
        relatorio: input.relatorio.trim(),
      },
      select: { id: true },
    });

    for (const custo of input.custos) {
      await tx.instalacaoCusto.create({
        data: {
          registroId: criado.id,
          categoria: custo.categoria,
          descricao: trimOrNull(custo.descricao),
          valor: custo.valor,
        },
      });
    }

    return criado;
  });
}

/** Edição: substitui os custos por completo, dentro da mesma transação. */
export async function atualizarRegistro(
  id: string,
  input: RegistroInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const atual = await tx.instalacaoRegistro.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!atual) throw new Error(REGISTRO_NAO_ENCONTRADO);

    await tx.instalacaoRegistro.update({
      where: { id },
      data: {
        tipo: input.tipo,
        aconteceuEm: input.aconteceuEm,
        responsavel: input.responsavel.trim(),
        relatorio: input.relatorio.trim(),
      },
    });

    await tx.instalacaoCusto.deleteMany({ where: { registroId: id } });
    for (const custo of input.custos) {
      await tx.instalacaoCusto.create({
        data: {
          registroId: id,
          categoria: custo.categoria,
          descricao: trimOrNull(custo.descricao),
          valor: custo.valor,
        },
      });
    }
  });
}

/**
 * Exclusão: permitida apenas quando o registro NÃO tem custos.
 *
 * A checagem é aqui, não na interface: o onDelete Cascade do banco apagaria os
 * custos junto, que é justamente o que a regra impede (ADR-0401).
 */
export async function excluirRegistro(id: string): Promise<void> {
  const custos = await prisma.instalacaoCusto.count({
    where: { registroId: id },
  });
  if (custos > 0) throw new Error(REGISTRO_COM_CUSTOS);

  await prisma.instalacaoRegistro.delete({ where: { id } });
}
```

- [ ] **Step 3: `getInstalacao` passa a carregar a cronologia**

Em `src/services/instalacao.service.ts`:

1. importar `mapRegistro`, `ORDEM_TIMELINE`, `INCLUDE_CUSTOS` e
   `type RegistroDTO` de `./instalacao-registro.service`;
2. acrescentar `registros: RegistroDTO[];` a `InstalacaoDetalhe`;
3. no `include` do `findUnique`, acrescentar:

```ts
      registros: { orderBy: ORDEM_TIMELINE, include: INCLUDE_CUSTOS },
```

4. no objeto de retorno, acrescentar:

```ts
    registros: i.registros.map(mapRegistro),
```

Um service importar de outro é aceitável aqui: são a mesma camada e o mesmo
agregado, e a alternativa (duplicar o mapper e a ordenação) criaria duas fontes
para a mesma regra.

- [ ] **Step 4: Typecheck e commit**

```bash
npm run typecheck
git add src/services/instalacao-registro.service.ts src/services/instalacao.service.ts
git commit -m "feat(instalacoes): service da cronologia com transação e regra de exclusão"
```

---

## Task 7: Server Actions do registro

**Files:**
- Create: `src/features/instalacoes/registro-actions.ts`

**Interfaces:**
- Consumes: service da Task 6; `registroSchema` da Task 5; `dataHoraDeInput` da Task 2.
- Produces: `criarRegistroAction`, `atualizarRegistroAction`, `excluirRegistroAction`.

- [ ] **Step 1: Implementar**

Criar `src/features/instalacoes/registro-actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";

import {
  atualizarRegistro,
  criarRegistro,
  excluirRegistro,
} from "@/services/instalacao-registro.service";
import { fail, ok, type ActionResult } from "@/types";

import { dataHoraDeInput } from "./datas";
import { registroSchema, type RegistroValues } from "./registro-schema";

/** Converte a data-hora do formulário; o schema já garantiu o formato. */
function paraInput(values: RegistroValues) {
  const aconteceuEm = dataHoraDeInput(values.aconteceuEm);
  if (!aconteceuEm) throw new Error("Data do acontecimento inválida.");
  return { ...values, aconteceuEm };
}

export async function criarRegistroAction(
  instalacaoId: string,
  values: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = registroSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    const criado = await criarRegistro(instalacaoId, paraInput(parsed.data));
    revalidatePath(`/instalacoes/${instalacaoId}`);
    return ok(criado);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao salvar.");
  }
}

export async function atualizarRegistroAction(
  instalacaoId: string,
  registroId: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = registroSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    await atualizarRegistro(registroId, paraInput(parsed.data));
    revalidatePath(`/instalacoes/${instalacaoId}`);
    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao salvar.");
  }
}

export async function excluirRegistroAction(
  instalacaoId: string,
  registroId: string,
): Promise<ActionResult> {
  try {
    await excluirRegistro(registroId);
    revalidatePath(`/instalacoes/${instalacaoId}`);
    return ok(undefined);
  } catch (error) {
    // A mensagem do bloqueio (REGISTRO_COM_CUSTOS) chega ao usuário como está.
    return fail(error instanceof Error ? error.message : "Falha ao excluir.");
  }
}
```

- [ ] **Step 2: Typecheck, lint e commit**

```bash
npm run typecheck && npm run lint
git add src/features/instalacoes/registro-actions.ts
git commit -m "feat(instalacoes): server actions da cronologia"
```

---

## Task 8: Editor de custos e diálogo do registro

**Files:**
- Create: `src/features/instalacoes/custos-editor.tsx`
- Create: `src/features/instalacoes/registro-dialog.tsx`

**Interfaces:**
- Consumes: `registroSchema`/`CustoValues` (Task 5); `CATEGORIA_CUSTO_LABEL`, `TIPOS_REGISTRO_ORDER`, `TIPO_REGISTRO_LABEL` (Task 4); `totalDoRegistro` (Task 3); `dataHoraParaInput` (Task 2).
- Produces: `CustosEditor`, `RegistroDialog`.

- [ ] **Step 1: Implementar o editor de custos**

`custos-editor.tsx` — lista editável de linhas de custo, **estado controlado**
(`custos: CustoValues[]` + `onChange`). O projeto **não usa `useFieldArray`** em
lugar nenhum; manter a consistência.

Cada linha:

| Campo | Componente |
|---|---|
| Categoria | `Select` com `CATEGORIA_CUSTO_LABEL` |
| Descrição | `Input` (opcional) |
| Valor | `CurrencyInput` de `@/components/forms` (standalone, sem RHF) |
| Remover | `Button` ícone `Trash2`, `type="button"`, `aria-label="Remover custo"` |

Abaixo da lista: botão **"+ Adicionar custo"** (`type="button"`) que acrescenta
uma linha com `{ categoria: "MATERIAL", descricao: "", valor: 0 }`, e o total do
bloco via `totalDoRegistro`, formatado com `formatCurrency`.

**Não validar aqui** — a validação é do `registroSchema`. O editor só edita.

- [ ] **Step 2: Implementar o diálogo**

`registro-dialog.tsx` — `Dialog` no molde de `cancelar-instalacao-dialog.tsx`:
`useForm` + `zodResolver(registroSchema)` + `form.reset(...)` dentro de
`useEffect` quando `open` vira true. **Não** usar `useState` + `setState` em
efeito — o lint barra (aconteceu na 4.0.1).

Campos: `SelectField tipo` (com `TIPOS_REGISTRO_ORDER`), `TextField aconteceuEm`
com `type="datetime-local"`, `TextField responsavel` (placeholder "Ex.: Carlos"),
`TextareaField relatorio` com `rows={6}`, e o `CustosEditor`.

Props: `open`, `onOpenChange`, `registro: RegistroDTO | null`, `submitting`,
`onConfirm(values: RegistroValues)`.

Ao abrir:
- **edição** — preencher com os dados do registro, usando
  `dataHoraParaInput(registro.aconteceuEm)` e os custos existentes;
- **criação** — `aconteceuEm` começa no instante atual
  (`dataHoraParaInput(new Date())`), `tipo` em `VISITA_CLIENTE`, custos vazios.

Título: "Novo registro" ou "Editar registro". Botão de confirmação: "Salvar".

Como os custos são estado controlado fora do RHF, mantenha-os em `useState` no
diálogo e injete no `handleSubmit` (`onConfirm({ ...values, custos })`), ou
registre o campo com `form.setValue("custos", ...)` a cada mudança. **Escolha uma
das duas e siga até o fim** — misturar as duas fontes é o caminho para um bug de
custo fantasma.

- [ ] **Step 3: Typecheck, lint e commit**

```bash
npm run typecheck && npm run lint
git add src/features/instalacoes/custos-editor.tsx src/features/instalacoes/registro-dialog.tsx
git commit -m "feat(instalacoes): diálogo de registro com editor de custos"
```

---

## Task 9: Timeline, resumo e workspace

**Files:**
- Create: `src/features/instalacoes/registro-card.tsx`
- Create: `src/features/instalacoes/cronologia.tsx`
- Create: `src/features/instalacoes/resumo-custos.tsx`
- Modify: `src/features/instalacoes/instalacao-workspace.tsx`
- Modify: `src/features/instalacoes/index.ts`

**Interfaces:**
- Consumes: actions da Task 7; `RegistroDTO`; `custos.ts`; `dataHoraParaExibicao`.
- Produces: `RegistroCard`, `Cronologia`, `ResumoCustos` — substituindo o placeholder.

- [ ] **Step 1: Implementar o card do acontecimento**

`registro-card.tsx` — um `Card` por acontecimento:

```
18/08/2026 10:00   [badge: Visita ao cliente]        [Editar] [Excluir]
Responsavel: Carlos

Realizada vistoria inicial. Cliente solicitou mudanca
de dois pontos de automacao da sala.

Custos
  Deslocamento ...................... R$ 80,00
  Material - 2 modulos .............. R$ 340,00
  ----------------------------------------------
  Total do registro ................. R$ 420,00
```

Pontos que não podem escapar:

- Data-hora com **`dataHoraParaExibicao`** (fuso fixo). **Não** usar
  `formatDateTime` de `@/utils` — ele não fixa timezone.
- Relatório preserva quebras de linha: `whitespace-pre-wrap`.
- Bloco de custos só aparece quando há custos.
- Total via `totalDoRegistro` + `formatCurrency`.
- "Excluir" abre `ConfirmDialog` de `@/components/shared`.
- Todos os botões com **`type="button"`** — o card fica dentro do `<form>` do
  workspace e um `type` ausente submeteria o cabeçalho.

- [ ] **Step 2: Implementar a timeline**

`cronologia.tsx` — props: `instalacaoId`, `registros: RegistroDTO[]`, `readOnly`.

- Botão **"Novo registro"** (`type="button"`) no topo.
- Lista de `RegistroCard`. **Os registros já chegam ordenados do service** — não
  reordenar aqui; a ordem é regra e regra fica no service.
- Lista vazia: `PageEmpty` ("Nenhum acontecimento registrado ainda").
- Orquestra o `RegistroDialog` (criar/editar) e a exclusão, chamando as actions
  e `router.refresh()` no sucesso; em erro, `toast.error(result.error)` — é
  assim que a mensagem de bloqueio de exclusão chega ao usuário.
- Com `readOnly` (instalação cancelada), esconder "Novo registro", "Editar" e
  "Excluir"; a timeline continua legível.

- [ ] **Step 3: Implementar o resumo**

`resumo-custos.tsx` — props: `registros: RegistroDTO[]`.

```
Custos extras acumulados        R$ 455,00
Registros                              3

Material .......... R$ 340,00
Frete ............. R$  35,00
Deslocamento ...... R$  80,00
```

Total via `totalDaInstalacao`; quebra por categoria via `totaisPorCategoria`,
**omitindo as categorias zeradas**. Nada é somado no componente além dessas
chamadas.

- [ ] **Step 4: Ligar no workspace**

Em `instalacao-workspace.tsx`, substituir o bloco do `PageEmpty` de Cronologia
por:

```tsx
<FormSection title="Cronologia" cols={1}>
  <ResumoCustos registros={data.registros} />
  <Cronologia
    instalacaoId={data.id}
    registros={data.registros}
    readOnly={readOnly}
  />
</FormSection>
```

Remover os imports de `ClipboardList` e `PageEmpty` se ficarem sem uso, e
atualizar o comentário do topo do arquivo, que hoje diz que a cronologia é
placeholder da 4.0.2.

- [ ] **Step 5: Verificar na aplicação**

```bash
npm run dev
```

Reproduzir o cenário de homologação da spec numa instalação de teste:

| Registro | Responsável | Custos |
|---|---|---|
| Visita ao cliente | Carlos | Deslocamento R$ 80 |
| Material comprado | Bruno | Material R$ 340 + Frete R$ 35 |
| Alteração de escopo | Vinicius | — |

Conferir **3 registros** e **R$ 455,00** acumulados.

Depois criar um quarto registro com `aconteceuEm` anterior a todos e confirmar
que ele aparece **no fim** da timeline, não no topo.

- [ ] **Step 6: Typecheck, lint e commit**

```bash
npm run typecheck && npm run lint
git add src/features/instalacoes
git commit -m "feat(instalacoes): timeline, resumo de custos e workspace"
```

---

## Task 10: Smoke E2E da cronologia

**Files:**
- Modify: `e2e/instalacoes.spec.ts`

- [ ] **Step 1: Acrescentar o helper de criação de registro**

Reutilizar `criarCliente` e `criarInstalacao`, já presentes no arquivo.
Acrescentar um helper que abre o diálogo, preenche e salva:

```ts
async function criarRegistro(
  page: Page,
  dados: {
    tipo: string;
    aconteceuEm: string;
    responsavel: string;
    relatorio: string;
    custos?: { categoria: string; valor: string }[];
  },
): Promise<void> {
  await page.getByRole("button", { name: "Novo registro" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Tipo").click();
  await page.getByRole("option", { name: dados.tipo }).click();
  await dialog.getByLabel("Data e hora").fill(dados.aconteceuEm);
  await dialog.getByLabel("Responsavel").fill(dados.responsavel);
  await dialog.getByLabel("Relatorio").fill(dados.relatorio);

  for (const custo of dados.custos ?? []) {
    await dialog.getByRole("button", { name: "Adicionar custo" }).click();
    const linha = dialog.getByTestId("linha-custo").last();
    await linha.getByLabel("Categoria").click();
    await page.getByRole("option", { name: custo.categoria }).click();
    await linha.getByLabel("Valor").fill(custo.valor);
  }

  await dialog.getByRole("button", { name: "Salvar" }).click();
  // O dialogo fechar e o sinal de conclusao — nao usar texto que tambem exista
  // no corpo do proprio dialogo.
  await expect(dialog).toBeHidden();
}
```

Ajuste os rótulos (`Tipo`, `Data e hora`, `Responsável`, `Relatório`,
`Categoria`, `Valor`) **para os que você usou de fato** na Task 8 — os rótulos
do teste seguem a tela, nunca o contrário. Se o `CustosEditor` não expuser um
seletor estável por linha, acrescente um na Task 8 antes de escrever o teste.

- [ ] **Step 2: Escrever o cenário completo**

Cobrir, na ordem exigida:

1. cliente E2E próprio;
2. instalação;
3. **visita ao cliente**, responsável "Carlos", deslocamento R$ 80;
4. **material comprado**, responsável "Bruno", material R$ 340 + frete R$ 35;
5. **alteração de escopo**, responsável "Vinicius", sem custo;
6. confirmar os **três** acontecimentos na timeline;
7. confirmar os três responsáveis;
8. confirmar **R$ 455,00** no total acumulado;
9. criar um quarto registro com `aconteceuEm` **anterior** a todos;
10. confirmar que ele aparece **por último** na timeline;
11. tentar excluir o registro **com** custo → confirmar a mensagem de bloqueio e
    que o registro continua na tela;
12. excluir o registro **sem** custo → confirmar a remoção.

Mais dois passos, para fechar os testes 14 e 15 exigidos pela spec:

13. **editar o relatório** de um registro existente → reabrir e confirmar o texto
    novo;
14. **editar os custos** desse registro (trocar R$ 340 por R$ 300) → confirmar
    que o total do registro **e** o total acumulado da instalação recalculam
    (R$ 455,00 → R$ 415,00).

O passo 14 é o que prova o delete-and-recreate: se a edição duplicasse custos em
vez de substituí-los, o total subiria em vez de cair.

Para o passo 10, comparar a ordem explicitamente, sem confiar no DOM:

```ts
const cards = page.getByTestId("registro-card");
await expect(cards.first()).toContainText("Material comprado");
await expect(cards.last()).toContainText("Vistoria antiga");
```

Notas de locator herdadas da 4.0.1, que valem aqui:

- `<input type="datetime-local">` é preenchido com `fill("2026-08-18T10:00")`.
- O Radix Select mantém um `<option>` nativo **oculto** que casa com
  `getByText` — ler valores pelo `combobox`, nunca por texto solto.
- Antes de qualquer asserção pós-salvamento, esperar o sinal de conclusão
  (diálogo fechar ou toast específico), nunca navegar direto.

- [ ] **Step 3: Rodar só este arquivo**

```bash
npm run test:e2e -- instalacoes
```

Esperado: verdes (3 da 4.0.1 + o novo).

- [ ] **Step 4: Rodar a suíte inteira**

```bash
npm run test:e2e
```

Esperado: nenhuma regressão em Propostas.

- [ ] **Step 5: Commit**

```bash
git add e2e/instalacoes.spec.ts
git commit -m "test(e2e): fluxo completo da cronologia e custos"
```

---

## Task 11: ADR-0401, documentação, VERSION e gate

**Files:**
- Modify: `DECISIONS.md`, `CHANGELOG.md`, `ARCHITECTURE.md`, `PROJECT_CONTEXT.md`, `VISION.md`, `PROJECT_HISTORY.md`, `VERSION`, `package.json`

- [ ] **Step 1: Registrar o ADR-0401**

Sob `## Sprint 4.0.2 — Cronologia e Custos`, cobrindo:

- **Cronologia × auditoria técnica** — dois mecanismos, um é conteúdo escrito
  pelos responsáveis e o outro é trilha de sistema. Registrar que operações de
  registro **não** geram auditoria e a consequência assumida: a exclusão de um
  registro (só possível sem custos) não deixa rastro.
- **`aconteceuEm` × `createdAt`** — ordenação por `aconteceuEm` desc com
  desempate por `createdAt`; fatos históricos permitidos, futuros rejeitados.
- **`datas.ts` estendido, não duplicado**, e por que o `formatDateTime` do
  projeto não serve: não fixa timezone e é compartilhado com Propostas.
- **Totais derivados**, com o arredondamento a 2 casas e por que isso diverge de
  `totais.ts` (que não é alterado).
- **Transação** na criação e delete-and-recreate na edição.
- **Regra de exclusão** e por que a checagem é do service: o `onDelete: Cascade`
  do banco apagaria os custos, que é o que a regra impede.
- **Custos são internos**: não alteram Proposta, não recalculam total comercial,
  não geram cobrança, aditivo, contrato, PDF ou comissão.

- [ ] **Step 2: Atualizar a documentação**

- `CHANGELOG.md`: fechar `[Não lançado]` como `## [1.2.0] — <data>`, reunindo
  4.0.1 e 4.0.2 como a entrega do módulo de Instalações.
- `ARCHITECTURE.md`: acrescentar `InstalacaoRegistro` e `InstalacaoCusto` à
  tabela de models e completar a seção 4.5 com a cronologia e o cálculo.
- `PROJECT_CONTEXT.md`: módulo de Instalações concluído; próximos ciclos são
  Pedido de Venda e Ordem de Serviço.
- `VISION.md`: regras funcionais da cronologia e dos custos — incluindo que
  custos extras **não alteram o valor comercial da Proposta**.
- `PROJECT_HISTORY.md`: seção da Sprint 4.0.2 no formato do arquivo.

- [ ] **Step 3: Atualizar `VERSION` e `package.json`**

`1.1.0` → **`1.2.0`**. MINOR: módulo novo, inteiramente aditivo.

**Este é o único momento em que a versão muda.** Não antecipar em nenhuma task
anterior.

- [ ] **Step 4: Gate completo**

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Depois, com `npm run dev` no ar: `/api/health` (200, `version: 1.2.0`,
`database: up`) e `/dev/diagnostics` (200, Prisma conectado). Encerrar os
processos `node` ao final — a porta 3000 precisa ficar livre.

- [ ] **Step 5: Verificação em banco**

Conferir por consulta direta:

- registros gravados com `aconteceuEm` **distinto** de `createdAt`;
- custos com tipo `numeric(12,2)`;
- **nenhuma** coluna de total nas duas tabelas novas;
- **nenhuma** entrada em `instalacao_auditorias` gerada por operação de registro.

- [ ] **Step 6: Commit da Sprint**

```bash
git add DECISIONS.md CHANGELOG.md ARCHITECTURE.md PROJECT_CONTEXT.md VISION.md PROJECT_HISTORY.md VERSION package.json
git commit -m "docs(instalacoes): ADR-0401, documentação e VERSION 1.2.0"
```

Registrar o hash no `PROJECT_HISTORY.md` num commit seguinte, como manda o item
13 do `CHECKLIST_RELEASE.md`.

---

## Critérios de conclusão

Funcionais — os itens de §45 da spec que faltavam:

- [ ] Adicionar registro de visita
- [ ] Adicionar atualização interna
- [ ] Registrar responsável obrigatório
- [ ] Informar data/hora do acontecimento
- [ ] Escrever relatório
- [ ] Adicionar mais de um custo a um registro
- [ ] Utilizar categorias diferentes
- [ ] Calcular total do registro
- [ ] Calcular total da instalação
- [ ] Mostrar a cronologia corretamente ordenada

Técnicos:

- [ ] Nenhum total persistido no banco
- [ ] `Decimal(12,2)` em todo valor monetário; custo zerado rejeitado
- [ ] Criação de registro + custos é atômica
- [ ] Edição substitui os custos na mesma transação
- [ ] Exclusão bloqueada com custos, permitida sem custos, com a checagem no service
- [ ] Timeline ordenada por `aconteceuEm`, não por `createdAt`
- [ ] Acontecimento histórico aceito; futuro rejeitado
- [ ] `datas.ts` estendido, sem módulo de datas paralelo
- [ ] `src/utils/format/date.ts` **não** alterado
- [ ] Registro não gera `InstalacaoAuditoria`
- [ ] Nenhuma entidade, FK ou tela de responsável
- [ ] Nenhum arquivo do módulo Comercial alterado
- [ ] `VERSION` = 1.2.0 apenas no commit final
- [ ] Gate do `CHECKLIST_RELEASE.md` integralmente verde

## Riscos

| Risco | Mitigação |
|---|---|
| **`datetime-local` não tem precedente no projeto**; formato e separadores do `Intl` variam por runtime | Helpers isolados em `datas.ts` com 11 testes; o Step 4 da Task 2 manda ajustar pelo resultado do teste, não por suposição |
| **Fuso na exibição** — o `formatDateTime` compartilhado não fixa timezone | `dataHoraParaExibicao` própria, com teste que prova independência do runtime |
| **Ponto flutuante** somando N custos | Arredondamento a 2 casas em `custos.ts`, travado por teste `0.1 + 0.2 = 0.3` |
| **Cascade apagaria os custos** ao excluir o registro | Regra no service, antes do delete; bloqueio coberto por E2E |
| **Ordenar por `createdAt` por engano** | Ordem definida no service (`ORDEM_TIMELINE`); E2E cria fato retroativo e confere a posição |
| **Botões dentro do `<form>` do workspace** submetendo o cabeçalho | `type="button"` obrigatório em todos; verificação manual no Step 5 da Task 9 |
| **Custos fora do RHF** virando fonte dupla de verdade no diálogo | Task 8 Step 2 exige escolher uma estratégia e segui-la até o fim |
| **Listas de enum duplicadas** entre `custos.ts`/`registro-schema.ts` e `labels.ts`/`registro-schema.ts` — `z.enum` exige tupla `as const`, e os arrays de ordem/rótulo não servem | Mesma duplicação que a 4.0.1 já tem entre `schema.ts` e `labels.ts`; o `Record<Tipo, string>` dos rótulos quebra no typecheck se um valor novo não for adicionado nos dois lugares |
| **`setState` em `useEffect`** reprovado pelo lint | Seguir `cancelar-instalacao-dialog.tsx`, que usa `form.reset()` |
| **Timeline longa** em instalações antigas | Paginação fora de escopo; `@@index([instalacaoId, aconteceuEm])` cobre a consulta |

## Fora do escopo

Tudo o que a spec lista em §5, mais: versionamento/histórico de alterações do
registro, anexos e fotos, dashboard e indicadores (§32), destaques operacionais
da listagem (§28) e qualquer efeito de custo sobre Proposta, contrato, PDF,
comissão ou faturamento.
