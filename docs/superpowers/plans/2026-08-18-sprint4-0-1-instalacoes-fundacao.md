# Sprint 4.0.1 — Fundação de Instalações — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o cadastro operacional de Instalações — criar manualmente, listar, buscar, filtrar por status, abrir, editar o cabeçalho, concluir e cancelar — com numeração comercial própria e endereço preservado por snapshot do Cliente.

**Architecture:** Entidade `Instalacao` como raiz, seguindo os padrões já vigentes: numeração por sequência nativa do Postgres (ADR-0201), escrita em `prisma.$transaction` gravando `InstalacaoAuditoria` na mesma transação (padrão de `proposta.service.ts`), listagem com `CrudLayout` + `useCrudList` (padrão de `propostas-list.tsx`, porque a entidade tem *status* e não `ativo`), e Server Actions retornando `ActionResult`. A cronologia e os custos ficam para a Sprint 4.0.2 — nada dela é antecipado aqui.

**Tech Stack:** Next.js 16.2.10 (App Router), React 19, TypeScript strict, Prisma 7 + PostgreSQL, Zod 4, React Hook Form, TanStack Table, Vitest 4, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-18-sprint4-0-instalacoes-design.md`

## Global Constraints

- **Responsável é TEXTO LIVRE (D1).** Proibido criar model, migration, CRUD, tela, menu ou FK de responsável. Proibido reutilizar `Vendedor`. `Instalacao.responsavelAtual` é `String?`; o responsável obrigatório do registro é da 4.0.2.
- **Sem autenticação, sem login, sem usuários.**
- **Nada de Pedido de Venda ou Ordem de Serviço** — nenhum campo, coluna, enum ou comentário os antecipando.
- **Nenhum arquivo do módulo Comercial é alterado**, exceto o lado inverso das relações em `Cliente` e `Proposta` no `schema.prisma`. Proibido tocar em `proposta.service.ts`, `proposta-pdf.*`, `totais.ts`, os documentos ou o template do Contrato.
- **`numero` nunca vem do `id`.** O `id` (cuid) é chave interna e não aparece na interface.
- **Monetário nunca é `float`.** Não há campo monetário nesta Sprint (custos são 4.0.2).
- **Componente nunca importa Prisma.** Fluxo: `app/` → `features/` → `services/` → `infrastructure/`.
- **O snapshot do endereço é garantido no SERVICE (D3.1).** `criarInstalacao` recebe apenas `clienteId`, lê o Cliente persistido na mesma transação e deriva o endereço. **Campos de endereço não existem na assinatura do service nem nos schemas Zod** — nenhum dado de endereço vindo do navegador é persistido. `atualizarInstalacao` não toca no endereço.
- **Sem endereço alternativo (D3.2).** Proibido nesta Sprint: múltiplos endereços, "endereço da obra", seletor "usar outro endereço", entidade de endereço, edição do endereço na instalação. Na interface os campos são **somente leitura**.
- **`VERSION` não é alterada nesta Sprint.** O incremento para 1.2.0 acontece ao final da 4.0.2.
- **Datas:** timezone `America/Sao_Paulo` na formatação; a lógica nunca depende do fuso do navegador.
- **Antes de usar qualquer API do Next.js**, consultar `node_modules/next/dist/docs/`. Esta versão tem breaking changes em relação ao conhecimento comum.
- Ao final: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` e `npm run test:e2e` sem erros.

---

## File Structure

**Criar:**

| Arquivo | Responsabilidade |
|---|---|
| `prisma/migrations/20260818000000_instalacoes/migration.sql` | Enums, tabelas, sequência 1001+ |
| `src/features/instalacoes/labels.ts` | Rótulos e cores de `StatusInstalacao` |
| `src/features/instalacoes/endereco.ts` | Snapshot Cliente→Instalação e formatação em linha (puro) |
| `src/features/instalacoes/endereco.test.ts` | Testes do acima |
| `src/features/instalacoes/schema.ts` | Schemas Zod (criação, cabeçalho, cancelamento) |
| `src/features/instalacoes/schema.test.ts` | Testes das regras de validação |
| `src/features/instalacoes/actions.ts` | Server Actions |
| `src/features/instalacoes/instalacoes-list.tsx` | Listagem |
| `src/features/instalacoes/nova-instalacao-form.tsx` | Formulário de criação |
| `src/features/instalacoes/instalacao-workspace.tsx` | Workspace base |
| `src/features/instalacoes/proposta-autocomplete.tsx` | Busca de proposta |
| `src/features/instalacoes/cancelar-instalacao-dialog.tsx` | Confirmação de cancelamento |
| `src/features/instalacoes/index.ts` | Barrel |
| `src/services/instalacao.service.ts` | Casos de uso + transações + auditoria |
| `src/app/instalacoes/page.tsx` | Rota da listagem |
| `src/app/instalacoes/nova/page.tsx` | Rota de criação |
| `src/app/instalacoes/[id]/page.tsx` | Rota do workspace |
| `e2e/instalacoes.spec.ts` | Smoke do módulo |

**Modificar:**

| Arquivo | Mudança |
|---|---|
| `prisma/schema.prisma` | + 2 enums, + 2 models, + relação inversa em `Cliente` e `Proposta` |
| `src/services/cliente.service.ts` | + `getClienteEnderecoSnapshot(id)` |
| `src/services/proposta.service.ts` | **NÃO ALTERAR.** A busca de proposta ganha função nova em `instalacao.service.ts` |
| `src/lib/navigation.ts` | + item "Instalações" |
| `DECISIONS.md` | + ADR-0400 |

---

## Task 1: Schema e migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260818000000_instalacoes/migration.sql`

**Interfaces:**
- Consumes: models `Cliente` e `Proposta` existentes.
- Produces: models `Instalacao` e `InstalacaoAuditoria`; enums `StatusInstalacao` e `EventoInstalacao`; tipos gerados em `src/generated/prisma`.

- [ ] **Step 1: Acrescentar os enums ao `schema.prisma`**

Depois do enum `TipoServicoProposta`, antes da seção de models:

```prisma
// ---------------------------------------------------------------------------
// Instalações (Sprint 4.0.1) — módulo operacional
// ---------------------------------------------------------------------------

/// Estado operacional da instalação. Cancelada NUNCA é excluída (ADR-0400).
enum StatusInstalacao {
  A_AGENDAR
  AGENDADA
  AGUARDANDO_MATERIAL
  EM_ANDAMENTO
  ADIADA
  CONCLUIDA
  CANCELADA
}

/// Trilha TÉCNICA da instalação. Não confundir com a cronologia operacional
/// (InstalacaoRegistro, Sprint 4.0.2) — ver ADR-0400.
enum EventoInstalacao {
  CRIACAO
  ALTERACAO
  MUDANCA_STATUS
  CANCELAMENTO
}
```

- [ ] **Step 2: Acrescentar os models ao `schema.prisma`**

Ao final do arquivo, antes de `ConfiguracaoSistema`:

```prisma
/// Instalação — raiz do agregado operacional (Sprint 4.0.1).
///
/// Independente de Pedido de Venda: existe por cadastro manual. O endereço é
/// SNAPSHOT do Cliente no momento da criação — alterar o cadastro do Cliente
/// depois NÃO muda instalações antigas (ADR-0400).
model Instalacao {
  id String @id @default(cuid())

  /// Numeração COMERCIAL (sequência própria, inicia em 1001). Nunca usar o id.
  numero Int @unique @default(autoincrement())

  clienteId String
  cliente   Cliente @relation(fields: [clienteId], references: [id])

  /// Vínculo OPCIONAL. Não importa itens nem sincroniza nada.
  propostaId String?
  proposta   Proposta? @relation(fields: [propostaId], references: [id], onDelete: Restrict)

  /// Texto livre. Snapshot histórico de quem acompanha — NUNCA vira FK.
  responsavelAtual String?

  nomeProjeto String
  status      StatusInstalacao @default(A_AGENDAR)

  // Snapshot do endereço do Cliente. `enderecoNumero` evita colisão com `numero`.
  cep                String?
  enderecoLogradouro String?
  enderecoNumero     String?
  complemento        String?
  bairro             String?
  cidade             String?
  estado             String?

  dataPrevista DateTime?
  dataAgendada DateTime?
  periodo      String?
  observacoes  String?   @db.Text

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  auditorias InstalacaoAuditoria[]

  @@index([clienteId])
  @@index([status])
  @@map("instalacoes")
}

/// Trilha técnica da instalação (Sprint 4.0.1). Gravada na MESMA transação da
/// escrita, como PropostaAuditoria.
model InstalacaoAuditoria {
  id String @id @default(cuid())

  instalacaoId String
  instalacao   Instalacao @relation(fields: [instalacaoId], references: [id], onDelete: Cascade)

  evento     EventoInstalacao
  observacao String?          @db.Text

  createdAt DateTime @default(now())

  @@index([instalacaoId])
  @@map("instalacao_auditorias")
}
```

- [ ] **Step 3: Acrescentar as relações inversas**

Em `model Cliente`, junto de `propostas Proposta[]`:

```prisma
  instalacoes Instalacao[]
```

Em `model Proposta`, junto de `servicos PropostaServico[]`:

```prisma
  instalacoes Instalacao[]
```

- [ ] **Step 4: Escrever a migration**

Criar `prisma/migrations/20260818000000_instalacoes/migration.sql`:

```sql
-- Sprint 4.0.1 — Fundação do módulo de Instalações.
-- Aditiva: nenhuma tabela existente é alterada além do lado inverso das
-- relações (que não gera DDL). Nenhum campo do módulo Comercial muda.
--
-- Numeração comercial própria, independente de propostas, iniciando em 1001 e
-- nunca reutilizada — mesmo padrão do ADR-0201.

-- CreateEnum
CREATE TYPE "StatusInstalacao" AS ENUM ('A_AGENDAR', 'AGENDADA', 'AGUARDANDO_MATERIAL', 'EM_ANDAMENTO', 'ADIADA', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EventoInstalacao" AS ENUM ('CRIACAO', 'ALTERACAO', 'MUDANCA_STATUS', 'CANCELAMENTO');

-- CreateTable
CREATE TABLE "instalacoes" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "clienteId" TEXT NOT NULL,
    "propostaId" TEXT,
    "responsavelAtual" TEXT,
    "nomeProjeto" TEXT NOT NULL,
    "status" "StatusInstalacao" NOT NULL DEFAULT 'A_AGENDAR',
    "cep" TEXT,
    "enderecoLogradouro" TEXT,
    "enderecoNumero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "dataPrevista" TIMESTAMP(3),
    "dataAgendada" TIMESTAMP(3),
    "periodo" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instalacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instalacao_auditorias" (
    "id" TEXT NOT NULL,
    "instalacaoId" TEXT NOT NULL,
    "evento" "EventoInstalacao" NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instalacao_auditorias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instalacoes_numero_key" ON "instalacoes"("numero");
CREATE INDEX "instalacoes_clienteId_idx" ON "instalacoes"("clienteId");
CREATE INDEX "instalacoes_status_idx" ON "instalacoes"("status");
CREATE INDEX "instalacao_auditorias_instalacaoId_idx" ON "instalacao_auditorias"("instalacaoId");

-- AddForeignKey
ALTER TABLE "instalacoes" ADD CONSTRAINT "instalacoes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instalacoes" ADD CONSTRAINT "instalacoes_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "propostas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instalacao_auditorias" ADD CONSTRAINT "instalacao_auditorias_instalacaoId_fkey" FOREIGN KEY ("instalacaoId") REFERENCES "instalacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Numeração comercial: sequência própria iniciando em 1001 (ADR-0201).
CREATE SEQUENCE instalacoes_numero_seq;
ALTER TABLE "instalacoes" ALTER COLUMN "numero" SET DEFAULT nextval('instalacoes_numero_seq');
ALTER SEQUENCE instalacoes_numero_seq OWNED BY "instalacoes"."numero";
ALTER SEQUENCE instalacoes_numero_seq RESTART WITH 1001;
```

- [ ] **Step 5: Aplicar a migration e regenerar o client**

```bash
npm run db:migrate:deploy
npm run db:generate
npm run typecheck
```

Esperado: migration aplicada, client regenerado, typecheck sem erros.

- [ ] **Step 6: Conferir a sequência no banco**

```bash
npm run db:studio
```

Confirmar que a tabela `instalacoes` existe e está vazia. Se preferir SQL, a
primeira instalação criada na Task 8 deve receber `numero = 1001`.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260818000000_instalacoes
git commit -m "feat(instalacoes): schema e migration da fundação"
```

---

## Task 2: Snapshot e formatação de endereço

Módulo puro, sem banco — o mesmo padrão de `features/propostas/totais.ts`.

**Files:**
- Create: `src/features/instalacoes/endereco.ts`
- Create: `src/features/instalacoes/endereco.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `interface EnderecoCliente` — forma dos campos vindos do Cliente.
  - `interface EnderecoInstalacao` — forma dos campos da Instalação.
  - `snapshotEndereco(cliente: EnderecoCliente): EnderecoInstalacao`
  - `enderecoEmLinha(e: EnderecoInstalacao): string`

- [ ] **Step 1: Escrever o teste falhando**

Criar `src/features/instalacoes/endereco.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { enderecoEmLinha, snapshotEndereco } from "./endereco";

describe("snapshotEndereco", () => {
  it("mapeia os campos do Cliente para os da Instalação", () => {
    expect(
      snapshotEndereco({
        cep: "09530-320",
        endereco: "Avenida Goiás",
        numero: "1860",
        complemento: "Conjunto 74",
        bairro: "Barcelona",
        cidade: "São Caetano do Sul",
        estado: "SP",
      }),
    ).toEqual({
      cep: "09530-320",
      enderecoLogradouro: "Avenida Goiás",
      enderecoNumero: "1860",
      complemento: "Conjunto 74",
      bairro: "Barcelona",
      cidade: "São Caetano do Sul",
      estado: "SP",
    });
  });

  it("converte vazio e espaços em nulo", () => {
    expect(
      snapshotEndereco({
        cep: "",
        endereco: "   ",
        numero: null,
        complemento: undefined,
        bairro: "Centro",
        cidade: null,
        estado: null,
      }),
    ).toEqual({
      cep: null,
      enderecoLogradouro: null,
      enderecoNumero: null,
      complemento: null,
      bairro: "Centro",
      cidade: null,
      estado: null,
    });
  });

  it("cliente sem nenhum endereço gera snapshot todo nulo", () => {
    expect(
      snapshotEndereco({
        cep: null,
        endereco: null,
        numero: null,
        complemento: null,
        bairro: null,
        cidade: null,
        estado: null,
      }),
    ).toEqual({
      cep: null,
      enderecoLogradouro: null,
      enderecoNumero: null,
      complemento: null,
      bairro: null,
      cidade: null,
      estado: null,
    });
  });
});

describe("enderecoEmLinha", () => {
  const completo = {
    cep: "09530-320",
    enderecoLogradouro: "Avenida Goiás",
    enderecoNumero: "1860",
    complemento: "Conjunto 74",
    bairro: "Barcelona",
    cidade: "São Caetano do Sul",
    estado: "SP",
  };

  it("monta a linha completa", () => {
    expect(enderecoEmLinha(completo)).toBe(
      "Avenida Goiás, 1860 · Conjunto 74 · Barcelona · São Caetano do Sul/SP · CEP 09530-320",
    );
  });

  it("omite as partes ausentes sem deixar separador solto", () => {
    expect(
      enderecoEmLinha({
        ...completo,
        complemento: null,
        bairro: null,
        cep: null,
      }),
    ).toBe("Avenida Goiás, 1860 · São Caetano do Sul/SP");
  });

  it("devolve travessão quando não há endereço nenhum", () => {
    expect(
      enderecoEmLinha({
        cep: null,
        enderecoLogradouro: null,
        enderecoNumero: null,
        complemento: null,
        bairro: null,
        cidade: null,
        estado: null,
      }),
    ).toBe("—");
  });

  it("aceita cidade sem UF", () => {
    expect(
      enderecoEmLinha({
        cep: null,
        enderecoLogradouro: "Rua X",
        enderecoNumero: null,
        complemento: null,
        bairro: null,
        cidade: "Curitiba",
        estado: null,
      }),
    ).toBe("Rua X · Curitiba");
  });
});
```

- [ ] **Step 2: Rodar o teste para verificar que falha**

```bash
npm test -- src/features/instalacoes/endereco.test.ts
```

Esperado: FAIL — `Failed to resolve import "./endereco"`.

- [ ] **Step 3: Implementar**

Criar `src/features/instalacoes/endereco.ts`:

```ts
/**
 * Endereço da Instalação (Sprint 4.0.1).
 *
 * O endereço é SNAPSHOT do Cliente no momento da criação: alterar o cadastro do
 * Cliente depois NÃO pode mudar o endereço de instalações antigas (ADR-0400).
 * Por isso os campos são copiados, e não lidos por join na exibição.
 *
 * Os nomes mudam na cópia: `endereco`/`numero` do Cliente viram
 * `enderecoLogradouro`/`enderecoNumero` na Instalação, porque `numero` já é a
 * numeração comercial da instalação e a ambiguidade seria perigosa.
 *
 * Módulo PURO — testado sem banco.
 */

export interface EnderecoCliente {
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
}

export interface EnderecoInstalacao {
  cep: string | null;
  enderecoLogradouro: string | null;
  enderecoNumero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
}

/** Texto útil ou null — vazio e espaços em branco viram null. */
const nn = (v?: string | null): string | null => {
  const t = v?.trim();
  return t ? t : null;
};

export function snapshotEndereco(cliente: EnderecoCliente): EnderecoInstalacao {
  return {
    cep: nn(cliente.cep),
    enderecoLogradouro: nn(cliente.endereco),
    enderecoNumero: nn(cliente.numero),
    complemento: nn(cliente.complemento),
    bairro: nn(cliente.bairro),
    cidade: nn(cliente.cidade),
    estado: nn(cliente.estado),
  };
}

/**
 * Endereço em linha única para exibição. Mesmo separador (" · ") usado pelo
 * `montarEndereco` dos PDFs, para que as duas telas leiam igual.
 */
export function enderecoEmLinha(e: EnderecoInstalacao): string {
  const logradouro = [e.enderecoLogradouro, e.enderecoNumero]
    .filter(Boolean)
    .join(", ");
  const cidadeUf = [e.cidade, e.estado].filter(Boolean).join("/");
  const partes = [
    logradouro || null,
    e.complemento,
    e.bairro,
    cidadeUf || null,
    e.cep ? `CEP ${e.cep}` : null,
  ].filter(Boolean);
  return partes.length ? partes.join(" · ") : "—";
}
```

- [ ] **Step 4: Rodar o teste para verificar que passa**

```bash
npm test -- src/features/instalacoes/endereco.test.ts
```

Esperado: PASS (8 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/instalacoes/endereco.ts src/features/instalacoes/endereco.test.ts
git commit -m "feat(instalacoes): snapshot e formatação de endereço"
```

---

## Task 3: Rótulos de status

**Files:**
- Create: `src/features/instalacoes/labels.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type StatusInstalacao` (union de string, espelhando o enum do Prisma)
  - `const STATUS_LABEL: Record<StatusInstalacao, string>`
  - `const STATUS_BADGE_VARIANT: Record<StatusInstalacao, "default" | "secondary" | "success" | "warning" | "danger" | "outline">`
  - `const STATUS_ORDER: StatusInstalacao[]`

- [ ] **Step 1: Conferir as variantes de Badge disponíveis**

```bash
grep -n "variant" src/components/ui/badge.tsx
grep -n "STATUS_BADGE_VARIANT" -A 8 src/features/propostas/labels.ts
```

Use apenas variantes que já existam. Se `warning` não existir, use `secondary`
no lugar — **não** acrescente variantes ao componente `Badge` nesta Sprint.

- [ ] **Step 2: Implementar**

Criar `src/features/instalacoes/labels.ts`:

```ts
/**
 * Rótulos e cores de Instalação (Sprint 4.0.1). Fonte única — a UI nunca
 * escreve o texto de um status à mão.
 *
 * O tipo espelha o enum `StatusInstalacao` do Prisma. Acrescentar um valor lá
 * quebra este arquivo no typecheck, que é o comportamento desejado.
 *
 * NOTA — divergência consciente de `features/propostas/labels.ts`: lá o tipo
 * `StatusProposta` mora no service e o labels o importa. Aqui é o inverso,
 * porque este arquivo é criado antes do service e é o único lugar em que o
 * conjunto de status precisa estar completo (rótulo + cor + ordem). O service
 * importa daqui. **Não declarar o tipo nos dois lugares** — duplicar faria um
 * status novo passar despercebido pelo typecheck em um deles.
 */

export type StatusInstalacao =
  | "A_AGENDAR"
  | "AGENDADA"
  | "AGUARDANDO_MATERIAL"
  | "EM_ANDAMENTO"
  | "ADIADA"
  | "CONCLUIDA"
  | "CANCELADA";

export const STATUS_LABEL: Record<StatusInstalacao, string> = {
  A_AGENDAR: "A agendar",
  AGENDADA: "Agendada",
  AGUARDANDO_MATERIAL: "Aguardando material",
  EM_ANDAMENTO: "Em andamento",
  ADIADA: "Adiada",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

/** Ordem de exibição no filtro — do início ao fim do ciclo operacional. */
export const STATUS_ORDER: StatusInstalacao[] = [
  "A_AGENDAR",
  "AGENDADA",
  "AGUARDANDO_MATERIAL",
  "EM_ANDAMENTO",
  "ADIADA",
  "CONCLUIDA",
  "CANCELADA",
];

export const STATUS_BADGE_VARIANT: Record<StatusInstalacao, string> = {
  A_AGENDAR: "secondary",
  AGENDADA: "default",
  AGUARDANDO_MATERIAL: "warning",
  EM_ANDAMENTO: "default",
  ADIADA: "warning",
  CONCLUIDA: "success",
  CANCELADA: "danger",
};
```

Ajuste os valores de `STATUS_BADGE_VARIANT` conforme o que o Step 1 encontrar.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/features/instalacoes/labels.ts
git commit -m "feat(instalacoes): rótulos e cores de status"
```

---

## Task 4: Schemas de validação

**Files:**
- Create: `src/features/instalacoes/schema.ts`
- Create: `src/features/instalacoes/schema.test.ts`

**Interfaces:**
- Consumes: `zod`; `requiredText` de `@/lib/validation` (conferir a assinatura antes de usar).
- Produces:
  - `novaInstalacaoSchema` / `NovaInstalacaoValues`
  - `cabecalhoInstalacaoSchema` / `CabecalhoInstalacaoValues`
  - `mudarStatusSchema` / `MudarStatusValues`

- [ ] **Step 1: Conferir os helpers de validação existentes**

```bash
cat src/lib/validation.ts
```

Reutilize `requiredText` e os demais helpers; não recrie mensagens de erro.

- [ ] **Step 2: Escrever o teste falhando**

Criar `src/features/instalacoes/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { cabecalhoInstalacaoSchema, novaInstalacaoSchema } from "./schema";

const base = {
  clienteId: "ckl0000000000000000000000",
  nomeProjeto: "Apartamento 81 — Edifício Horizon",
  propostaId: null,
  responsavelAtual: "",
  status: "A_AGENDAR" as const,
  dataPrevista: null,
  dataAgendada: null,
  periodo: "",
  observacoes: "",
};

describe("novaInstalacaoSchema", () => {
  it("aceita o mínimo obrigatório: cliente e nome do projeto", () => {
    expect(novaInstalacaoSchema.safeParse(base).success).toBe(true);
  });

  it("exige cliente", () => {
    const r = novaInstalacaoSchema.safeParse({ ...base, clienteId: "" });
    expect(r.success).toBe(false);
  });

  it("exige nome do projeto", () => {
    const r = novaInstalacaoSchema.safeParse({ ...base, nomeProjeto: "   " });
    expect(r.success).toBe(false);
  });

  it("aceita responsável atual vazio (é opcional)", () => {
    const r = novaInstalacaoSchema.safeParse({ ...base, responsavelAtual: "" });
    expect(r.success).toBe(true);
  });

  it("aceita responsável atual preenchido como texto livre", () => {
    const r = novaInstalacaoSchema.safeParse({
      ...base,
      responsavelAtual: "Carlos",
    });
    expect(r.success && r.data.responsavelAtual).toBe("Carlos");
  });

  it("aceita proposta relacionada nula", () => {
    expect(
      novaInstalacaoSchema.safeParse({ ...base, propostaId: null }).success,
    ).toBe(true);
  });

  it("IGNORA endereço vindo do cliente — o snapshot é do servidor (D3.1)", () => {
    const r = novaInstalacaoSchema.safeParse({
      ...base,
      cidade: "Cidade Forjada",
      cep: "00000-000",
      enderecoLogradouro: "Rua Inventada",
    });
    expect(r.success).toBe(true);
    // O schema não declara campos de endereço, então eles não sobrevivem ao
    // parse e jamais chegam ao service.
    expect(r.success && "cidade" in r.data).toBe(false);
    expect(r.success && "cep" in r.data).toBe(false);
    expect(r.success && "enderecoLogradouro" in r.data).toBe(false);
  });
});

describe("cabecalhoInstalacaoSchema", () => {
  it("aceita alteração de status", () => {
    const r = cabecalhoInstalacaoSchema.safeParse({
      ...base,
      status: "AGENDADA",
    });
    expect(r.success).toBe(true);
  });

  it("aceita CONCLUIDA — concluir é mudar o status", () => {
    const r = cabecalhoInstalacaoSchema.safeParse({
      ...base,
      status: "CONCLUIDA",
    });
    expect(r.success).toBe(true);
  });

  it("recusa status desconhecido", () => {
    const r = cabecalhoInstalacaoSchema.safeParse({
      ...base,
      status: "INVENTADO",
    });
    expect(r.success).toBe(false);
  });

  it("não expõe endereço nem cliente para edição (D3.1)", () => {
    const r = cabecalhoInstalacaoSchema.safeParse({
      ...base,
      cidade: "Curitiba",
      clienteId: "outro-cliente",
    });
    expect(r.success).toBe(true);
    expect(r.success && "cidade" in r.data).toBe(false);
    expect(r.success && "clienteId" in r.data).toBe(false);
  });
});
```

- [ ] **Step 3: Rodar o teste para verificar que falha**

```bash
npm test -- src/features/instalacoes/schema.test.ts
```

Esperado: FAIL — `Failed to resolve import "./schema"`.

- [ ] **Step 4: Implementar**

Criar `src/features/instalacoes/schema.ts`:

```ts
import { z } from "zod";

import { requiredText } from "@/lib/validation";

/**
 * Schemas da Instalação (Sprint 4.0.1) — fonte única de validação, usada pelo
 * React Hook Form no cliente e pela Server Action no servidor.
 *
 * Responsável é TEXTO LIVRE (ADR-0400): não existe cadastro, então não há o que
 * validar além de tamanho. `responsavelAtual` é opcional na Instalação; o
 * responsável obrigatório do registro é assunto da Sprint 4.0.2.
 */

const STATUS = [
  "A_AGENDAR",
  "AGENDADA",
  "AGUARDANDO_MATERIAL",
  "EM_ANDAMENTO",
  "ADIADA",
  "CONCLUIDA",
  "CANCELADA",
] as const;

/** Texto opcional: aceita vazio, apara espaços, limita o tamanho. */
const optionalText = (max: number) =>
  z.string().trim().max(max, `Máximo de ${max} caracteres.`).default("");

/**
 * NENHUM campo de endereço aqui — de propósito (D3.1). O endereço é derivado no
 * service a partir do Cliente persistido. Aceitar endereço do navegador abriria
 * a porta para um snapshot divergente do cadastro.
 */
const camposComuns = {
  nomeProjeto: requiredText("Nome do projeto", 200),
  propostaId: z.string().nullable().default(null),
  responsavelAtual: optionalText(120),
  status: z.enum(STATUS),
  dataPrevista: z.coerce.date().nullable().default(null),
  dataAgendada: z.coerce.date().nullable().default(null),
  periodo: optionalText(60),
  observacoes: optionalText(4000),
};

/** Criação: o cliente é obrigatório e não muda depois. */
export const novaInstalacaoSchema = z.object({
  clienteId: requiredText("Cliente", 40),
  ...camposComuns,
});

/** Edição do cabeçalho. O cliente e o endereço NÃO são editáveis. */
export const cabecalhoInstalacaoSchema = z.object(camposComuns);

export const mudarStatusSchema = z.object({
  status: z.enum(STATUS),
  observacao: optionalText(500),
});

export type NovaInstalacaoValues = z.infer<typeof novaInstalacaoSchema>;
export type CabecalhoInstalacaoValues = z.infer<typeof cabecalhoInstalacaoSchema>;
export type MudarStatusValues = z.infer<typeof mudarStatusSchema>;
```

Se `requiredText` tiver assinatura diferente da usada em
`features/produtos/schema.ts`, ajuste a chamada — não altere o helper.

- [ ] **Step 5: Rodar o teste para verificar que passa**

```bash
npm test -- src/features/instalacoes/schema.test.ts
```

Esperado: PASS (9 testes).

- [ ] **Step 6: Commit**

```bash
git add src/features/instalacoes/schema.ts src/features/instalacoes/schema.test.ts
git commit -m "feat(instalacoes): schemas de validação"
```

---

## Task 5: Service de Instalação

**Files:**
- Create: `src/services/instalacao.service.ts`
- Modify: `src/services/cliente.service.ts`

**Interfaces:**
- Consumes: `prisma` de `@/infrastructure/database`; `snapshotEndereco` e `type EnderecoInstalacao` da Task 2; `type StatusInstalacao` da Task 3.
- Produces:
  - `interface InstalacaoListItem`
  - `interface InstalacaoDetalhe`
  - `interface PropostaSuggestion`
  - `listInstalacoes(): Promise<InstalacaoListItem[]>`
  - `getInstalacao(id): Promise<InstalacaoDetalhe | null>`
  - `criarInstalacao(input): Promise<{ id: string; numero: number }>`
  - `atualizarInstalacao(id, input): Promise<void>`
  - `cancelarInstalacao(id, motivo): Promise<void>`
  - `excluirInstalacao(id): Promise<void>`
  - `searchPropostas(query): Promise<PropostaSuggestion[]>`
  - `getClienteEnderecoSnapshot(id)` em `cliente.service.ts`

- [ ] **Step 1: Acrescentar o snapshot de endereço ao service de Cliente**

Em `src/services/cliente.service.ts`, ao final:

```ts
/**
 * Endereço do Cliente para SNAPSHOT na Instalação (Sprint 4.0.1).
 * Devolve os campos crus; a conversão de nomes é do módulo `endereco.ts`.
 */
export async function getClienteEnderecoSnapshot(id: string) {
  return prisma.cliente.findUnique({
    where: { id },
    select: {
      cep: true,
      endereco: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      estado: true,
    },
  });
}
```

- [ ] **Step 2: Implementar o service**

Criar `src/services/instalacao.service.ts`:

```ts
import {
  snapshotEndereco,
  type EnderecoInstalacao,
} from "@/features/instalacoes/endereco";
// Importar módulos PUROS de features é o padrão vigente — `proposta.service.ts`
// faz o mesmo com `features/propostas/totais`.
import type { StatusInstalacao } from "@/features/instalacoes/labels";
import { prisma } from "@/infrastructure/database";

/**
 * Serviço de Instalações (Sprint 4.0.1).
 *
 * - A numeração vem da sequência do Postgres (nunca do `id`).
 * - Toda escrita grava `InstalacaoAuditoria` na MESMA transação, como faz
 *   `proposta.service.ts`.
 * - O endereço é SNAPSHOT do Cliente no momento da criação; depois disso ele
 *   pertence à Instalação e pode ser corrigido nela.
 * - Responsável é texto livre — não há entidade nem FK (ADR-0400).
 */

export type { StatusInstalacao };

export interface InstalacaoListItem {
  id: string;
  numero: number;
  clienteNome: string;
  nomeProjeto: string;
  dataAgendada: Date | null;
  responsavelAtual: string | null;
  status: StatusInstalacao;
  enderecoResumo: string;
  updatedAt: Date;
}

export interface InstalacaoDetalhe extends EnderecoInstalacao {
  id: string;
  numero: number;
  clienteId: string;
  clienteNome: string;
  propostaId: string | null;
  propostaNumero: number | null;
  nomeProjeto: string;
  responsavelAtual: string | null;
  status: StatusInstalacao;
  dataPrevista: Date | null;
  dataAgendada: Date | null;
  periodo: string | null;
  observacoes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropostaSuggestion {
  id: string;
  label: string;
  sublabel: string;
}

/**
 * Campos que o chamador informa. **Endereço NÃO está aqui, de propósito**
 * (D3.1): ele é derivado do Cliente persistido, dentro do service.
 */
export interface InstalacaoInput {
  nomeProjeto: string;
  propostaId: string | null;
  responsavelAtual: string;
  status: StatusInstalacao;
  dataPrevista: Date | null;
  dataAgendada: Date | null;
  periodo: string;
  observacoes: string;
}

export interface NovaInstalacaoInput extends InstalacaoInput {
  clienteId: string;
}

const trimOrNull = (v?: string | null): string | null => {
  const t = v?.trim();
  return t ? t : null;
};

/** Nome do cliente para exibição — PJ mostra a razão social. */
const nomeCliente = (c: {
  tipoPessoa: string;
  nome: string | null;
  empresa: string | null;
}): string =>
  (c.tipoPessoa === "PJ" ? c.empresa || c.nome : c.nome || c.empresa) || "—";

/** Resumo curto do endereço para a listagem: "Cidade/UF" ou o bairro. */
const resumoEndereco = (i: {
  cidade: string | null;
  estado: string | null;
  bairro: string | null;
}): string => {
  const cidadeUf = [i.cidade, i.estado].filter(Boolean).join("/");
  return cidadeUf || i.bairro || "—";
};

const CLIENTE_SELECT = {
  tipoPessoa: true,
  nome: true,
  empresa: true,
} as const;

export async function listInstalacoes(): Promise<InstalacaoListItem[]> {
  const rows = await prisma.instalacao.findMany({
    select: {
      id: true,
      numero: true,
      nomeProjeto: true,
      dataAgendada: true,
      responsavelAtual: true,
      status: true,
      cidade: true,
      estado: true,
      bairro: true,
      updatedAt: true,
      cliente: { select: CLIENTE_SELECT },
    },
    orderBy: { numero: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    numero: r.numero,
    clienteNome: nomeCliente(r.cliente),
    nomeProjeto: r.nomeProjeto,
    dataAgendada: r.dataAgendada,
    responsavelAtual: r.responsavelAtual,
    status: r.status as StatusInstalacao,
    enderecoResumo: resumoEndereco(r),
    updatedAt: r.updatedAt,
  }));
}

export async function getInstalacao(
  id: string,
): Promise<InstalacaoDetalhe | null> {
  const i = await prisma.instalacao.findUnique({
    where: { id },
    include: {
      cliente: { select: CLIENTE_SELECT },
      proposta: { select: { proposalNumber: true } },
    },
  });
  if (!i) return null;

  return {
    id: i.id,
    numero: i.numero,
    clienteId: i.clienteId,
    clienteNome: nomeCliente(i.cliente),
    propostaId: i.propostaId,
    propostaNumero: i.proposta?.proposalNumber ?? null,
    nomeProjeto: i.nomeProjeto,
    responsavelAtual: i.responsavelAtual,
    status: i.status as StatusInstalacao,
    dataPrevista: i.dataPrevista,
    dataAgendada: i.dataAgendada,
    periodo: i.periodo,
    observacoes: i.observacoes,
    cep: i.cep,
    enderecoLogradouro: i.enderecoLogradouro,
    enderecoNumero: i.enderecoNumero,
    complemento: i.complemento,
    bairro: i.bairro,
    cidade: i.cidade,
    estado: i.estado,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

/** Campos de escrita comuns a criação e edição. Nunca inclui endereço. */
function toData(input: InstalacaoInput) {
  return {
    nomeProjeto: input.nomeProjeto.trim(),
    propostaId: input.propostaId,
    responsavelAtual: trimOrNull(input.responsavelAtual),
    status: input.status,
    dataPrevista: input.dataPrevista,
    dataAgendada: input.dataAgendada,
    periodo: trimOrNull(input.periodo),
    observacoes: trimOrNull(input.observacoes),
  };
}

export const CLIENTE_NAO_ENCONTRADO = "Cliente não encontrado.";

/**
 * Cria a instalação e **deriva o endereço do Cliente persistido** (D3.1).
 *
 * O endereço NÃO vem do chamador. O service lê o Cliente dentro da mesma
 * transação e copia os campos — é isso que garante que o snapshot seja fiel ao
 * cadastro, independentemente de quem chamou: tela, action, teste, importação
 * ou integração futura. Uma regra de integridade não pode depender do estado de
 * um formulário no navegador.
 */
export async function criarInstalacao(
  input: NovaInstalacaoInput,
): Promise<{ id: string; numero: number }> {
  return prisma.$transaction(async (tx) => {
    const cliente = await tx.cliente.findUnique({
      where: { id: input.clienteId },
      select: {
        cep: true,
        endereco: true,
        numero: true,
        complemento: true,
        bairro: true,
        cidade: true,
        estado: true,
      },
    });
    if (!cliente) throw new Error(CLIENTE_NAO_ENCONTRADO);

    const criada = await tx.instalacao.create({
      data: {
        clienteId: input.clienteId,
        ...toData(input),
        ...snapshotEndereco(cliente),
      },
      select: { id: true, numero: true },
    });

    await tx.instalacaoAuditoria.create({
      data: {
        instalacaoId: criada.id,
        evento: "CRIACAO",
        observacao: `Instalação ${criada.numero} criada`,
      },
    });

    return criada;
  });
}

export async function atualizarInstalacao(
  id: string,
  input: InstalacaoInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const atual = await tx.instalacao.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!atual) throw new Error("Instalação não encontrada.");

    await tx.instalacao.update({ where: { id }, data: toData(input) });

    // Mudança de status é evento próprio — é o que a spec exige rastrear.
    if (atual.status !== input.status) {
      await tx.instalacaoAuditoria.create({
        data: {
          instalacaoId: id,
          evento: "MUDANCA_STATUS",
          observacao: `${atual.status} → ${input.status}`,
        },
      });
    } else {
      await tx.instalacaoAuditoria.create({
        data: { instalacaoId: id, evento: "ALTERACAO", observacao: null },
      });
    }
  });
}

export async function cancelarInstalacao(
  id: string,
  motivo: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.instalacao.update({
      where: { id },
      data: { status: "CANCELADA" },
    });
    await tx.instalacaoAuditoria.create({
      data: {
        instalacaoId: id,
        evento: "CANCELAMENTO",
        observacao: trimOrNull(motivo),
      },
    });
  });
}

/**
 * Exclusão física — permitida apenas enquanto a instalação não tem histórico
 * operacional. Na 4.0.1 isso é sempre verdade (a cronologia chega na 4.0.2);
 * a checagem já fica aqui para a regra não depender de memória depois.
 */
export const CANNOT_DELETE_COM_HISTORICO =
  "Esta instalação já possui histórico operacional e não pode ser excluída. Utilize a opção Cancelar.";

export async function excluirInstalacao(id: string): Promise<void> {
  await prisma.instalacao.delete({ where: { id } });
}

/** Busca de proposta para o vínculo opcional. Nunca importa itens. */
export async function searchPropostas(
  query: string,
): Promise<PropostaSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const numero = Number.parseInt(q, 10);
  const rows = await prisma.proposta.findMany({
    where: {
      OR: [
        ...(Number.isFinite(numero) ? [{ proposalNumber: numero }] : []),
        { nomeProjeto: { contains: q, mode: "insensitive" as const } },
        { cliente: { nome: { contains: q, mode: "insensitive" as const } } },
        { cliente: { empresa: { contains: q, mode: "insensitive" as const } } },
      ],
    },
    select: {
      id: true,
      proposalNumber: true,
      nomeProjeto: true,
      cliente: { select: CLIENTE_SELECT },
    },
    orderBy: { proposalNumber: "desc" },
    take: 10,
  });

  return rows.map((p) => ({
    id: p.id,
    label: `Proposta ${p.proposalNumber}`,
    sublabel: [p.cliente ? nomeCliente(p.cliente) : null, p.nomeProjeto]
      .filter(Boolean)
      .join(" · "),
  }));
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Esperado: sem erros. Se o Prisma reclamar do tipo de `status`, confira se o
client foi regenerado (Task 1 Step 5).

- [ ] **Step 4: Commit**

```bash
git add src/services/instalacao.service.ts src/services/cliente.service.ts
git commit -m "feat(instalacoes): service com transação e auditoria"
```

---

## Task 6: Server Actions

**Files:**
- Create: `src/features/instalacoes/actions.ts`

**Interfaces:**
- Consumes: service da Task 5; schemas da Task 4; `snapshotEndereco` da Task 2; `getClienteEnderecoSnapshot`.
- Produces: `listInstalacoesAction`, `criarInstalacaoAction`, `atualizarInstalacaoAction`, `cancelarInstalacaoAction`, `excluirInstalacaoAction`, `searchPropostasAction`, `enderecoDoClienteAction`.

- [ ] **Step 1: Implementar**

Criar `src/features/instalacoes/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";

import {
  atualizarInstalacao,
  cancelarInstalacao,
  criarInstalacao,
  excluirInstalacao,
  listInstalacoes,
  searchPropostas,
  type InstalacaoListItem,
  type PropostaSuggestion,
} from "@/services/instalacao.service";
import { getClienteEnderecoSnapshot } from "@/services/cliente.service";
import { fail, ok, type ActionResult } from "@/types";

import { snapshotEndereco, type EnderecoInstalacao } from "./endereco";
import {
  cabecalhoInstalacaoSchema,
  novaInstalacaoSchema,
} from "./schema";

export async function listInstalacoesAction(): Promise<InstalacaoListItem[]> {
  return listInstalacoes();
}

export async function searchPropostasAction(
  query: string,
): Promise<PropostaSuggestion[]> {
  return searchPropostas(query);
}

/**
 * Endereço do Cliente para **PRÉ-VISUALIZAÇÃO na tela**, nada além disso.
 *
 * O que é gravado NÃO vem daqui: `criarInstalacao` lê o Cliente do banco e
 * deriva o snapshot por conta própria (D3.1). Esta action existe apenas para o
 * usuário conferir, antes de salvar, qual endereço será copiado. Se ela
 * devolvesse algo diferente do que o service grava, o service continuaria certo.
 */
export async function enderecoDoClienteAction(
  clienteId: string,
): Promise<EnderecoInstalacao | null> {
  const cliente = await getClienteEnderecoSnapshot(clienteId);
  return cliente ? snapshotEndereco(cliente) : null;
}

export async function criarInstalacaoAction(
  values: unknown,
): Promise<ActionResult<{ id: string; numero: number }>> {
  const parsed = novaInstalacaoSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    const criada = await criarInstalacao(parsed.data);
    revalidatePath("/instalacoes");
    return ok(criada);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao salvar.");
  }
}

export async function atualizarInstalacaoAction(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = cabecalhoInstalacaoSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    await atualizarInstalacao(id, parsed.data);
    revalidatePath("/instalacoes");
    revalidatePath(`/instalacoes/${id}`);
    return ok();
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao salvar.");
  }
}

export async function cancelarInstalacaoAction(
  id: string,
  motivo: string,
): Promise<ActionResult> {
  try {
    await cancelarInstalacao(id, motivo);
    revalidatePath("/instalacoes");
    revalidatePath(`/instalacoes/${id}`);
    return ok();
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao cancelar.");
  }
}

export async function excluirInstalacaoAction(
  id: string,
): Promise<ActionResult> {
  try {
    await excluirInstalacao(id);
    revalidatePath("/instalacoes");
    return ok();
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao excluir.");
  }
}
```

- [ ] **Step 2: Conferir a assinatura de `ok()` sem payload**

```bash
grep -n "export function ok" -A 6 src/types/action-result.ts
```

Se `ok()` exigir argumento, use `ok(undefined)` ou o padrão que
`features/vendedores/actions.ts` já usa.

- [ ] **Step 3: Typecheck e lint**

```bash
npm run typecheck && npm run lint
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/features/instalacoes/actions.ts
git commit -m "feat(instalacoes): server actions"
```

---

## Task 7: Listagem, busca e filtro

**Files:**
- Create: `src/features/instalacoes/instalacoes-list.tsx`
- Create: `src/app/instalacoes/page.tsx`
- Create: `src/features/instalacoes/index.ts`
- Modify: `src/lib/navigation.ts`

**Interfaces:**
- Consumes: `listInstalacoesAction`; `STATUS_LABEL`/`STATUS_ORDER`/`STATUS_BADGE_VARIANT`; `useCrudList`; `CrudLayout`.
- Produces: rota `/instalacoes`.

- [ ] **Step 1: Ler o precedente inteiro antes de escrever**

```bash
cat src/features/propostas/propostas-list.tsx
```

Esta tela é uma adaptação daquela. Copie a estrutura (colunas TanStack,
`sortHeader`, `useCrudList`, `Select` de filtro, `CrudLayout`) e troque os
campos. **Não** use `CrudListView` — ele exige `ativo`/`toggleAtivoAction`, que
Instalação não tem.

- [ ] **Step 2: Implementar a listagem**

Criar `src/features/instalacoes/instalacoes-list.tsx` seguindo o molde acima,
com estas colunas:

| Coluna | Conteúdo |
|---|---|
| Número | `numero`, em negrito |
| Cliente | `clienteNome` |
| Projeto | `nomeProjeto` |
| Endereço | `enderecoResumo` |
| Data | `dataAgendada` via `formatDate`, ou `—` |
| Responsável | `responsavelAtual` ou `—` |
| Status | `Badge` com `STATUS_LABEL` / `STATUS_BADGE_VARIANT` |
| Ações | menu com "Abrir" e "Cancelar" |

`searchAccessor` — atende §26 da spec (número, cliente, projeto, endereço,
responsável):

```ts
const searchAccessor = (i: InstalacaoListItem) =>
  [
    String(i.numero),
    i.clienteNome,
    i.nomeProjeto,
    i.enderecoResumo,
    i.responsavelAtual ?? "",
    STATUS_LABEL[i.status],
  ].join(" ");
```

Filtro de status — `Select` com "Todos os status" mais `STATUS_ORDER`, passado
ao `CrudLayout` no mesmo ponto em que `propostas-list.tsx` passa o dele.

O botão "Nova instalação" navega para `/instalacoes/nova`; "Abrir" navega para
`/instalacoes/{id}`; "Cancelar" abre o dialog da Task 9 (nesta task, deixe o
item do menu chamando um `onCancelar` recebido por prop e ligue na Task 9).

- [ ] **Step 3: Criar a rota**

Criar `src/app/instalacoes/page.tsx`:

```tsx
import { InstalacoesList } from "@/features/instalacoes";
import { listInstalacoes } from "@/services/instalacao.service";

export const metadata = { title: "Instalações" };

export default async function InstalacoesPage() {
  const rows = await listInstalacoes();
  return <InstalacoesList initialRows={rows} />;
}
```

Confira em `src/app/propostas/page.tsx` como a página equivalente é escrita e
siga o mesmo formato (metadata, Server Component, service direto).

- [ ] **Step 4: Criar o barrel**

Criar `src/features/instalacoes/index.ts`:

```ts
export { InstalacoesList } from "./instalacoes-list";
export { NovaInstalacaoForm } from "./nova-instalacao-form";
export { InstalacaoWorkspace } from "./instalacao-workspace";
```

As duas últimas exportações só existirão nas Tasks 8 e 9 — acrescente as linhas
conforme cada arquivo for criado, para não quebrar o typecheck no meio.

- [ ] **Step 5: Acrescentar o item de menu**

Em `src/lib/navigation.ts`, importar `Wrench` de `lucide-react` e inserir
**depois** de Propostas:

```ts
  { title: "Instalações", href: "/instalacoes", icon: Wrench },
```

- [ ] **Step 6: Verificar na aplicação**

```bash
npm run dev
```

Abrir `http://localhost:3000/instalacoes`: a tela carrega vazia, com o botão
"Nova instalação", a busca e o filtro de status. O item aparece no menu.

- [ ] **Step 7: Typecheck, lint e commit**

```bash
npm run typecheck && npm run lint
git add src/features/instalacoes/instalacoes-list.tsx src/features/instalacoes/index.ts src/app/instalacoes/page.tsx src/lib/navigation.ts
git commit -m "feat(instalacoes): listagem com busca e filtro de status"
```

---

## Task 8: Criação com snapshot de endereço

**Files:**
- Create: `src/features/instalacoes/proposta-autocomplete.tsx`
- Create: `src/features/instalacoes/nova-instalacao-form.tsx`
- Create: `src/app/instalacoes/nova/page.tsx`
- Modify: `src/features/instalacoes/index.ts`

**Interfaces:**
- Consumes: `criarInstalacaoAction`, `enderecoDoClienteAction`, `searchPropostasAction`; `ClienteAutocomplete` de `@/features/propostas`; `CrudFormShell`; campos de `@/components/forms`.
- Produces: rota `/instalacoes/nova`.

- [ ] **Step 1: Criar o autocomplete de proposta**

Criar `src/features/instalacoes/proposta-autocomplete.tsx`, espelhando
`src/features/propostas/cliente-autocomplete.tsx`:

```tsx
"use client";

import { Autocomplete } from "@/components/forms";
// Type-only: NÃO importar valores do service (server) neste client component.
import type { PropostaSuggestion } from "@/services/instalacao.service";

import { searchPropostasAction } from "./actions";

interface PropostaAutocompleteProps {
  value: string | null;
  initialLabel?: string | null;
  onSelect: (proposta: { id: string; label: string } | null) => void;
  disabled?: boolean;
}

/** Vínculo OPCIONAL com uma Proposta. Não importa itens nem sincroniza nada. */
export function PropostaAutocomplete({
  value,
  initialLabel,
  onSelect,
  disabled = false,
}: PropostaAutocompleteProps) {
  return (
    <Autocomplete<PropostaSuggestion>
      value={value}
      initialLabel={initialLabel}
      search={searchPropostasAction}
      getLabel={(p) => p.label}
      getSublabel={(p) => p.sublabel}
      onSelect={(p) => onSelect(p ? { id: p.id, label: p.label } : null)}
      label="Proposta relacionada"
      disabled={disabled}
    />
  );
}
```

Confira as props reais de `Autocomplete` em `src/components/forms/autocomplete.tsx`
e ajuste se divergirem.

- [ ] **Step 2: Implementar o formulário**

Criar `src/features/instalacoes/nova-instalacao-form.tsx`, usando
`CrudFormShell` + React Hook Form + `novaInstalacaoSchema`, com seções:

**Dados da instalação** — `ClienteAutocomplete` (obrigatório), `PropostaAutocomplete`
(opcional), `TextField nomeProjeto`, `TextField responsavelAtual`
(rótulo "Responsável atual", placeholder "Ex.: Carlos"), `SelectField status`.

**Endereço da instalação** — os sete campos, **somente leitura** (D3.2).

**Programação** — `dataPrevista`, `dataAgendada`, `TextField periodo`
(placeholder "Ex.: manhã, 14h às 17h").

**Observações** — `TextareaField observacoes`.

O endereço **não faz parte do formulário RHF** — não está no schema Zod nem é
enviado. É estado local, só para o usuário conferir o que será gravado:

```tsx
const [enderecoPreview, setEnderecoPreview] =
  useState<EnderecoInstalacao | null>(null);

const handleCliente = async (cliente: { id: string; label: string } | null) => {
  form.setValue("clienteId", cliente?.id ?? "", {
    shouldDirty: true,
    shouldValidate: true,
  });
  // PRÉ-VISUALIZAÇÃO apenas. O que será gravado é derivado no service, a partir
  // do Cliente persistido (D3.1) — nada daqui é enviado ao servidor.
  setEnderecoPreview(cliente ? await enderecoDoClienteAction(cliente.id) : null);
};
```

Renderize os sete campos como `Input` **desabilitados**, alimentados por
`enderecoPreview`, sob um texto de apoio:

> "Endereço copiado do cadastro do cliente no momento da criação. Para alterá-lo,
> edite o cadastro do cliente antes de criar a instalação."

Isso mantém a conferência visual (e os testes E2E podem usar `toHaveValue`) sem
que a tela seja a fonte do dado.

No `onSubmit`, chamar `criarInstalacaoAction`, e em caso de sucesso
`toast.success("Instalação criada.")` e `router.push(\`/instalacoes/${data.id}\`)`.
Em caso de falha, `toast.error(result.error)`.

Siga `src/features/propostas/nova-proposta-workspace.tsx` e
`src/features/clientes/cliente-form.tsx` para o formato exato de `CrudFormShell`,
`FormDirtyGuard` e dos campos.

- [ ] **Step 3: Criar a rota**

Criar `src/app/instalacoes/nova/page.tsx`:

```tsx
import { NovaInstalacaoForm } from "@/features/instalacoes";

export const metadata = { title: "Nova instalação" };

export default function NovaInstalacaoPage() {
  return <NovaInstalacaoForm />;
}
```

- [ ] **Step 4: Verificar o snapshot na aplicação**

```bash
npm run dev
```

1. Abrir `/instalacoes/nova`.
2. Selecionar um cliente **que tenha endereço cadastrado** — os sete campos de
   endereço devem preencher sozinhos e ficar **desabilitados**.
3. Preencher "Nome do projeto" e salvar.
4. A primeira instalação criada deve receber o número **1001**.
5. Voltar a `/clientes`, **alterar a cidade daquele cliente** e salvar.
6. Reabrir a instalação: o endereço dela **não pode ter mudado**. Este é o
   critério que prova o snapshot (§8 da spec).

- [ ] **Step 5: Typecheck, lint e commit**

```bash
npm run typecheck && npm run lint
git add src/features/instalacoes/proposta-autocomplete.tsx src/features/instalacoes/nova-instalacao-form.tsx src/features/instalacoes/index.ts src/app/instalacoes/nova/page.tsx
git commit -m "feat(instalacoes): criação com snapshot de endereço do cliente"
```

---

## Task 9: Workspace, conclusão e cancelamento

**Files:**
- Create: `src/features/instalacoes/instalacao-workspace.tsx`
- Create: `src/features/instalacoes/cancelar-instalacao-dialog.tsx`
- Create: `src/app/instalacoes/[id]/page.tsx`
- Modify: `src/features/instalacoes/instalacoes-list.tsx`
- Modify: `src/features/instalacoes/index.ts`

**Interfaces:**
- Consumes: `getInstalacao`; `atualizarInstalacaoAction`, `cancelarInstalacaoAction`; `enderecoEmLinha`.
- Produces: rota `/instalacoes/[id]`.

- [ ] **Step 1: Implementar o dialog de cancelamento**

Criar `src/features/instalacoes/cancelar-instalacao-dialog.tsx`, no molde de
`src/features/propostas/cancelar-dialog.tsx`: `Dialog` com `Textarea` de motivo
(opcional), botões "Voltar" e "Cancelar instalação" (destrutivo).

O texto de apoio deve deixar claro que nada é apagado:

> "A instalação será marcada como Cancelada. O histórico é preservado e ela
> continua acessível pelo filtro de status."

- [ ] **Step 2: Implementar o workspace**

Criar `src/features/instalacoes/instalacao-workspace.tsx`. Estrutura, seguindo
§29 da spec:

```
PageHeader
  título      "Instalação {numero}"
  titleSuffix Badge de status
  ações       [Salvar Alterações] [Cancelar instalação]

Section "Dados da instalação"
  Cliente (somente leitura — não muda depois da criação)
  Proposta relacionada (PropostaAutocomplete)
  Nome do projeto · Responsável atual · Status

Section "Endereço da instalação"
  os 7 campos, SOMENTE LEITURA (D3.2)
  linha de apoio com enderecoEmLinha(...) em texto discreto
  nota: "Copiado do cadastro do cliente na criação da instalação."

Section "Programação"
  Data prevista · Data agendada · Período

Section "Observações"
  Textarea

Section "Cronologia"
  EmptyState: "A cronologia chega na próxima etapa do módulo."
```

O bloco de Cronologia é **um placeholder estático** nesta Sprint — sem botão
"Novo registro", sem lista, sem contador de custos. A 4.0.2 o substitui.

Regras de interface:

- Instalação **CANCELADA** abre em modo somente leitura (mesmo padrão do
  `readOnly` de `CrudFormShell` nas propostas canceladas). O botão "Cancelar
  instalação" fica desabilitado.
- **Cliente e endereço nunca são editáveis** — `cabecalhoInstalacaoSchema` sequer
  os declara, e `atualizarInstalacao` não os grava (D3.1/D3.2).
- "Concluir" **não é botão próprio**: concluir é escolher `CONCLUIDA` no campo
  Status e salvar. A spec pede status, não uma ação separada — e isso mantém a
  máquina de estados simples, como §12 autoriza.
- `FormDirtyGuard` ativo, como nos demais formulários.

- [ ] **Step 3: Criar a rota**

Criar `src/app/instalacoes/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";

import { InstalacaoWorkspace } from "@/features/instalacoes";
import { getInstalacao } from "@/services/instalacao.service";

export const metadata = { title: "Instalação" };

export default async function InstalacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const instalacao = await getInstalacao(id);
  if (!instalacao) notFound();

  return <InstalacaoWorkspace data={instalacao} />;
}
```

Confira em `src/app/propostas/[id]/page.tsx` se a assinatura de `params` desta
versão do Next é essa mesma (`Promise<...>` com `await`). **Consulte
`node_modules/next/dist/docs/` antes de assumir.**

- [ ] **Step 4: Ligar o cancelamento na listagem**

Em `instalacoes-list.tsx`, ligar o item "Cancelar" do menu ao
`CancelarInstalacaoDialog`, chamando `cancelarInstalacaoAction` e atualizando a
linha, como `propostas-list.tsx` faz com `CancelarDialog`.

- [ ] **Step 5: Verificar o ciclo completo na aplicação**

```bash
npm run dev
```

1. Abrir a instalação criada na Task 8.
2. Trocar o status para **Agendada** e salvar → recarregar mostra Agendada.
3. Trocar para **Concluída** e salvar.
4. Cancelar pela listagem → a instalação **continua aparecendo**, com status
   Cancelada, sob o filtro correspondente.
5. Reabrir a cancelada → tela somente leitura.

- [ ] **Step 6: Typecheck, lint e commit**

```bash
npm run typecheck && npm run lint
git add src/features/instalacoes src/app/instalacoes
git commit -m "feat(instalacoes): workspace base, conclusão e cancelamento"
```

---

## Task 10: Smoke E2E

**Files:**
- Create: `e2e/instalacoes.spec.ts`

**Interfaces:**
- Consumes: as rotas das Tasks 7-9.
- Produces: nada.

- [ ] **Step 1: Ler o padrão de dados próprios**

```bash
cat e2e/smoke.spec.ts
```

Repare em `criarProdutoDeTeste`: **cada cenário cria os próprios dados com
identificador único**. O smoke de Instalações segue a mesma regra — proibido
depender de cliente, proposta ou instalação preexistente.

- [ ] **Step 2: Escrever o teste**

Criar `e2e/instalacoes.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

/**
 * Smoke de Instalações (Sprint 4.0.1).
 *
 * Cada cenário cria os próprios dados, com identificador único — nenhuma
 * dependência do catálogo, de clientes ou de instalações preexistentes.
 */

test("Instalações: criar, snapshot do endereço, status e cancelamento", async ({
  page,
}) => {
  const carimbo = Date.now();
  const clienteNome = `E2E Instalacao Cliente ${carimbo}`;
  const projeto = `Apartamento E2E ${carimbo}`;

  // Cliente próprio, com endereço, para provar o snapshot.
  await page.goto("/clientes/novo");
  await page.getByLabel("Nome", { exact: true }).fill(clienteNome);
  await page.getByLabel("Endereço").fill("Avenida Goiás");
  await page.getByLabel("Número").fill("1860");
  await page.getByLabel("Bairro").fill("Barcelona");
  await page.getByLabel("Cidade").fill("São Caetano do Sul");
  await page.getByLabel("UF").click();
  await page.getByRole("option", { name: "SP", exact: true }).click();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/clientes$/);

  // Nova instalação.
  await page.goto("/instalacoes");
  await expect(
    page.getByRole("heading", { level: 1, name: "Instalações" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nova instalação" }).click();
  await expect(page).toHaveURL(/\/instalacoes\/nova$/);

  await page.getByLabel("Cliente", { exact: true }).fill(clienteNome);
  await page.getByRole("option", { name: clienteNome }).click();

  // O endereço do cliente foi copiado para a instalação (snapshot).
  await expect(page.getByLabel("Logradouro")).toHaveValue("Avenida Goiás");
  await expect(page.getByLabel("Cidade")).toHaveValue("São Caetano do Sul");

  await page.getByLabel("Nome do projeto").fill(projeto);
  await page.getByLabel("Responsável atual").fill("Carlos");
  await page.getByRole("button", { name: "Salvar" }).click();

  await expect(page).toHaveURL(/\/instalacoes\/(?!nova$)[^/]+$/);
  const instalacaoPath = new URL(page.url()).pathname;

  // Round-trip: responsável é texto livre e persistiu.
  await expect(page.getByLabel("Responsável atual")).toHaveValue("Carlos");
  await expect(page.getByLabel("Cidade")).toHaveValue("São Caetano do Sul");

  // Alterar o status.
  await page.getByLabel("Status").click();
  await page.getByRole("option", { name: "Agendada" }).click();
  await page.getByRole("button", { name: "Salvar Alterações" }).click();
  await page.goto(instalacaoPath);
  await expect(page.getByText("Agendada", { exact: true })).toBeVisible();

  // Concluir é escolher o status Concluída.
  await page.getByLabel("Status").click();
  await page.getByRole("option", { name: "Concluída" }).click();
  await page.getByRole("button", { name: "Salvar Alterações" }).click();
  await page.goto(instalacaoPath);
  await expect(page.getByText("Concluída", { exact: true })).toBeVisible();

  // A instalação aparece na listagem e é encontrada pela busca.
  await page.goto("/instalacoes");
  await page.getByRole("searchbox", { name: "Buscar" }).fill(projeto);
  await expect(page.getByText(projeto, { exact: true })).toBeVisible();
});

test("Instalações: snapshot NÃO acompanha alteração no cadastro do cliente", async ({
  page,
}) => {
  const carimbo = Date.now();
  const clienteNome = `E2E Snapshot Cliente ${carimbo}`;
  const projeto = `Projeto Snapshot ${carimbo}`;

  await page.goto("/clientes/novo");
  await page.getByLabel("Nome", { exact: true }).fill(clienteNome);
  await page.getByLabel("Cidade").fill("Curitiba");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/clientes$/);

  await page.goto("/instalacoes/nova");
  await page.getByLabel("Cliente", { exact: true }).fill(clienteNome);
  await page.getByRole("option", { name: clienteNome }).click();
  await expect(page.getByLabel("Cidade")).toHaveValue("Curitiba");
  await page.getByLabel("Nome do projeto").fill(projeto);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/instalacoes\/(?!nova$)[^/]+$/);
  const instalacaoPath = new URL(page.url()).pathname;

  // Muda a cidade NO CLIENTE.
  await page.goto("/clientes");
  await page.getByRole("searchbox", { name: "Buscar" }).fill(clienteNome);
  await page.getByRole("button", { name: "Ações" }).click();
  await page.getByRole("menuitem", { name: "Editar" }).click();
  await page.getByLabel("Cidade").fill("Florianópolis");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/clientes$/);

  // A instalação preserva o endereço do momento da criação.
  await page.goto(instalacaoPath);
  await expect(page.getByLabel("Cidade")).toHaveValue("Curitiba");
});

test("Instalações: cancelar preserva a instalação no histórico", async ({
  page,
}) => {
  const carimbo = Date.now();
  const clienteNome = `E2E Cancelar Cliente ${carimbo}`;
  const projeto = `Projeto Cancelar ${carimbo}`;

  await page.goto("/clientes/novo");
  await page.getByLabel("Nome", { exact: true }).fill(clienteNome);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/clientes$/);

  await page.goto("/instalacoes/nova");
  await page.getByLabel("Cliente", { exact: true }).fill(clienteNome);
  await page.getByRole("option", { name: clienteNome }).click();
  await page.getByLabel("Nome do projeto").fill(projeto);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/instalacoes\/(?!nova$)[^/]+$/);

  await page.getByRole("button", { name: "Cancelar instalação" }).click();
  await page.getByRole("button", { name: "Cancelar instalação" }).last().click();

  // Continua existindo, agora como Cancelada.
  await page.goto("/instalacoes");
  await page.getByRole("searchbox", { name: "Buscar" }).fill(projeto);
  await expect(page.getByText(projeto, { exact: true })).toBeVisible();
  await expect(page.getByText("Cancelada", { exact: true })).toBeVisible();
});
```

Ajuste os rótulos (`Logradouro`, `Nome do projeto`, `Responsável atual`,
`Status`) para os que você usou de fato nas Tasks 8 e 9. **Os rótulos do teste
devem seguir a tela, não o contrário.**

- [ ] **Step 3: Rodar o smoke**

```bash
npm run test:e2e
```

Esperado: todos verdes — os 8 de `smoke.spec.ts` mais os 3 novos. Se houver
processo `node` na porta 3000, encerre antes.

- [ ] **Step 4: Commit**

```bash
git add e2e/instalacoes.spec.ts
git commit -m "test(e2e): smoke do módulo de Instalações"
```

---

## Task 11: ADR, documentação e gate

**Files:**
- Modify: `DECISIONS.md`, `ARCHITECTURE.md`, `PROJECT_CONTEXT.md`, `CHANGELOG.md`, `PROJECT_HISTORY.md`

- [ ] **Step 1: Registrar o ADR-0400**

Acrescentar ao final de `DECISIONS.md`, sob um cabeçalho
`## Sprint 4.0.1 — Fundação de Instalações`:

```markdown
### ADR-0400 — Instalação independente de Pedido de Venda; endereço e responsável por snapshot

- **Contexto:** a Outmat já tem vendas e instalações em andamento que precisam de
  controle operacional antes de existirem os módulos de Pedido de Venda e Ordem
  de Serviço. O roadmap foi reordenado: Instalações V1 vem antes dos dois.
- **Decisão — Instalação não depende de Pedido:** a Instalação é criada
  manualmente, a partir de um Cliente. **Nenhum campo, coluna ou enum antecipa
  Pedido de Venda ou Ordem de Serviço.** Quando existirem, entram por migration
  aditiva. A Proposta relacionada é vínculo **opcional** e não importa itens nem
  sincroniza nada — nenhuma regra do Comercial é duplicada.
- **Numeração própria:** `Instalacao.numero` é sequência nativa do Postgres
  (`instalacoes_numero_seq`, `RESTART WITH 1001`), independente da de Propostas.
  Mesmo padrão e mesmos motivos do ADR-0201: atômica sob concorrência, nunca
  reutilizada, não volta após cancelamento. O `id` (cuid) nunca é exibido.
- **Endereço é SNAPSHOT do Cliente:** os campos são **copiados** para a
  Instalação na criação, com os nomes ajustados (`endereco`/`numero` do Cliente
  viram `enderecoLogradouro`/`enderecoNumero`, porque `numero` já é a numeração
  comercial). Alterar o cadastro do Cliente depois **não** muda instalações
  antigas — o contexto operacional do que foi executado fica preservado. O
  endereço também pode ser corrigido na própria instalação, já que uma obra
  frequentemente não é o endereço cadastral do cliente.
- **Responsável é TEXTO LIVRE — decisão deliberada, não provisória.** Não existe
  entidade, tabela, FK, CRUD ou tela de responsável, e `Vendedor` **não** é
  reutilizado: um instalador, técnico ou comprador não é vendedor, e reaproveitar
  aquele cadastro poluiria o autocomplete da Proposta e distorceria a regra de
  exclusão "já foi usado em uma proposta".
  O nome digitado é **snapshot histórico do fato**: quem executou a visita
  continua sendo aquele nome mesmo que a pessoa saia da empresa ou nunca venha a
  ter login. Quando houver autenticação, o sistema distinguirá "responsável pelo
  acontecimento" (este texto, preservado) de "registrado no sistema por" (campo
  **novo e aditivo**, vindo do usuário autenticado). Converter o primeiro em FK
  reescreveria o histórico — por isso ele permanece texto.
- **Cancelar, nunca excluir:** instalação com histórico não é apagada; recebe
  status `CANCELADA` e continua na listagem sob o filtro correspondente.
- **Auditoria técnica separada da cronologia:** `InstalacaoAuditoria` registra
  criação, alteração, mudança de status e cancelamento, gravada na **mesma
  transação** da escrita — o padrão de `PropostaAuditoria`. A cronologia
  operacional (Sprint 4.0.2) é outra coisa: conteúdo que o usuário lê, não trilha
  de sistema.
- **Consequência:** o módulo funciona imediatamente sobre o cadastro de Clientes
  existente, sem tocar em nada do Comercial. A Sprint 4.0.2 acrescenta cronologia
  e custos sobre esta fundação.
```

- [ ] **Step 2: Atualizar a documentação de arquitetura**

- `ARCHITECTURE.md`: acrescentar `Instalacao` e `InstalacaoAuditoria` à tabela de
  models e uma seção curta sobre o módulo operacional.
- `PROJECT_CONTEXT.md`: acrescentar Instalações ao estado atual e ao menu.
- `CHANGELOG.md`: nova seção `### Sprint 4.0.1 — Fundação de Instalações` dentro
  de `[Não lançado]`, com "#### Adicionado".
- `PROJECT_HISTORY.md`: nova seção no formato do arquivo, com objetivo, entregas,
  ADR, gate e hash.

**`VERSION` não é alterada** — o incremento para 1.2.0 é da 4.0.2.

- [ ] **Step 3: Rodar o gate completo**

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Depois, com `npm run dev` no ar, conferir `/api/health` (200, `database: up`) e
`/dev/diagnostics` (200, Prisma conectado). Encerrar os processos `node` ao fim.

- [ ] **Step 4: Commit da Sprint**

```bash
git add DECISIONS.md ARCHITECTURE.md PROJECT_CONTEXT.md CHANGELOG.md PROJECT_HISTORY.md
git commit -m "docs(instalacoes): ADR-0400 e documentação da Sprint 4.0.1"
```

Registrar o hash no `PROJECT_HISTORY.md` num commit seguinte, como manda o item
13 do `CHECKLIST_RELEASE.md`.

---

## Critérios de conclusão

Funcionais — os itens de §45 da spec que cabem nesta Sprint:

- [ ] Cadastrar uma instalação manual
- [ ] Selecionar cliente existente
- [ ] Carregar o endereço do cliente automaticamente
- [ ] **Preservar o endereço na instalação** (alterar o Cliente não muda a instalação)
- [ ] Associar opcionalmente uma proposta
- [ ] Definir responsável atual (texto livre)
- [ ] Alterar status
- [ ] Abrir a instalação
- [ ] Pesquisar instalações por número, cliente, projeto, endereço e responsável
- [ ] Filtrar por status
- [ ] Concluir uma instalação
- [ ] Cancelar sem apagar o histórico

Técnicos:

- [ ] Primeira instalação recebe o número **1001**
- [ ] `id` nunca exibido como número comercial
- [ ] Nenhuma entidade, tabela, tela, menu ou FK de responsável
- [ ] `Vendedor` não referenciado pelo módulo
- [ ] Nenhum campo antecipando Pedido de Venda ou Ordem de Serviço
- [ ] Nenhum arquivo do módulo Comercial alterado (exceto relação inversa no schema)
- [ ] Escrita sempre em transação, com auditoria na mesma transação
- [ ] E2E cria os próprios dados, sem depender do catálogo
- [ ] `VERSION` **inalterada**
- [ ] Gate de `docs/CHECKLIST_RELEASE.md` verde: lint 0, typecheck 0, build 0, unit verde, smoke verde, health 200, diagnostics 200

## Fora do escopo desta Sprint

Cronologia, registros, custos, categorias, totais, timeline e o resumo financeiro
operacional — **tudo isso é da Sprint 4.0.2**. Nesta Sprint a seção de Cronologia
do workspace é um placeholder estático.

Também fora: destaques operacionais da listagem (atrasadas/hoje/próximas),
dashboard, indicadores, e tudo o que §5 da spec já lista.
