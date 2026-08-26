import { Client } from "pg";

/**
 * Limpeza dos dados criados pelos testes E2E (Sprint 4.0.3, ADR-0403).
 *
 * ⚠️ **INFRAESTRUTURA DE TESTE — NUNCA IMPORTAR DE `src/`.**
 *
 * Este módulo vive em `e2e/`, fora da aplicação, e fala com o PostgreSQL
 * diretamente. Ele existe porque a aplicação, por regra de negócio, **não
 * apaga** Proposta nem Instalação — as duas são canceladas, nunca excluídas
 * (ADR-0203, ADR-0400). Afrouxar essa regra para acomodar teste seria trocar
 * uma garantia do domínio por conveniência de suíte, e criar um endpoint de
 * exclusão em massa seria pior ainda. A saída correta é uma ferramenta de teste,
 * isolada e explicitamente identificada como tal.
 *
 * Estratégia ÚNICA do projeto: varredura por marcador no `globalTeardown` do
 * Playwright, depois da suíte inteira — inclusive quando há testes falhando.
 * Escolhida em vez de `afterEach`/fixture por cenário porque os testes encadeiam
 * entidades entre passos (cliente → proposta → instalação → registro → custo);
 * uma varredura por marcador em ordem de dependência é verificável de forma
 * completa, enquanto o teardown por cenário depende de cada teste lembrar tudo
 * o que criou.
 *
 * Nunca `TRUNCATE`. Nunca `DELETE` sem `WHERE`.
 */

/** Cliente criado por teste: `E2E {rótulo} {timestamp}`. */
const MARCADOR_CLIENTE = "E2E %";
/** Produto criado por teste: `E2E-{rótulo}-{timestamp}-{seq}`. */
const MARCADOR_PRODUTO = "E2E-%";
/** Usuário criado por teste: `E2E Usuario {rótulo} {timestamp}`. */
const MARCADOR_USUARIO = "E2E %";

export interface ContagemResiduos {
  clientes: number;
  produtos: number;
  propostas: number;
  instalacoes: number;
  registros: number;
  custos: number;
  usuarios: number;
}

export interface ResultadoLimpeza {
  antes: ContagemResiduos;
  depois: ContagemResiduos;
}

const HOSTS_PERMITIDOS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Três guardas. Qualquer uma que falhe interrompe antes de qualquer `DELETE`.
 *
 * Não é defesa contra ataque — é defesa contra engano: um `.env` apontado para o
 * servidor errado, uma variável exportada na sessão, um `npm run test:e2e`
 * disparado no lugar indevido.
 */
export function validarAmbiente(databaseUrl = process.env.DATABASE_URL): string {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[limpeza E2E] Recusado: NODE_ENV=production. Esta rotina nunca roda em produção.",
    );
  }

  if (process.env.E2E_CLEANUP === "0") {
    throw new Error(
      "[limpeza E2E] Recusado: E2E_CLEANUP=0. Remova a variável para permitir a limpeza.",
    );
  }

  if (!databaseUrl) {
    throw new Error(
      "[limpeza E2E] Recusado: DATABASE_URL ausente. O teardown carrega o .env via dotenv/config.",
    );
  }

  let host: string;
  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    throw new Error("[limpeza E2E] Recusado: DATABASE_URL inválida.");
  }

  if (!HOSTS_PERMITIDOS.has(host)) {
    throw new Error(
      `[limpeza E2E] Recusado: host "${host}" não é local. ` +
        `Permitidos: ${[...HOSTS_PERMITIDOS].join(", ")}.`,
    );
  }

  return databaseUrl;
}

/** Propostas e instalações são "de teste" por pertencerem a um cliente de teste. */
const CLIENTES_E2E = `SELECT id FROM clientes WHERE nome LIKE $1`;
const PROPOSTAS_E2E = `SELECT id FROM propostas WHERE "clienteId" IN (${CLIENTES_E2E})`;
const INSTALACOES_E2E = `SELECT id FROM instalacoes WHERE "clienteId" IN (${CLIENTES_E2E})`;

async function contar(client: Client): Promise<ContagemResiduos> {
  const { rows } = await client.query<Record<string, string>>(
    `SELECT
       (SELECT count(*) FROM clientes    WHERE nome   LIKE $1) AS clientes,
       (SELECT count(*) FROM produtos    WHERE codigo LIKE $2) AS produtos,
       (SELECT count(*) FROM propostas   WHERE "clienteId" IN (${CLIENTES_E2E})) AS propostas,
       (SELECT count(*) FROM instalacoes WHERE "clienteId" IN (${CLIENTES_E2E})) AS instalacoes,
       (SELECT count(*) FROM instalacao_registros
          WHERE "instalacaoId" IN (${INSTALACOES_E2E})) AS registros,
       (SELECT count(*) FROM instalacao_custos
          WHERE "registroId" IN (
            SELECT id FROM instalacao_registros
             WHERE "instalacaoId" IN (${INSTALACOES_E2E})
          )) AS custos,
       (SELECT count(*) FROM usuarios WHERE nome LIKE $3) AS usuarios`,
    [MARCADOR_CLIENTE, MARCADOR_PRODUTO, MARCADOR_USUARIO],
  );
  const r = rows[0];
  return {
    clientes: Number(r.clientes),
    produtos: Number(r.produtos),
    propostas: Number(r.propostas),
    instalacoes: Number(r.instalacoes),
    registros: Number(r.registros),
    custos: Number(r.custos),
    usuarios: Number(r.usuarios),
  };
}

/**
 * Ordem de exclusão explícita. **Não confiar em cascade** onde há `Restrict`:
 *
 *   Instalacao.propostaId    → Restrict  ⇒ instalações antes de propostas
 *   PropostaItem.produtoId   → Restrict  ⇒ itens antes de produtos
 *   Usuario → Restrict       ⇒ usuários por último — TRÊS relações apontam
 *                              para ele desde a Sprint 4.2 (ADR-0410):
 *                              Proposta.vendedorId (NOVA),
 *                              Instalacao.tecnicoResponsavelId e
 *                              InstalacaoRegistro.tecnicoId
 *
 * `propostas.currentRevisionId` aponta para `proposta_revisoes`; o vínculo é
 * zerado antes de apagar as revisões, senão a FK bloqueia.
 */
async function apagar(client: Client): Promise<void> {
  const c = [MARCADOR_CLIENTE];
  const p = [MARCADOR_PRODUTO];

  // ── Instalações (e tudo que pende delas) ────────────────────────────────
  await client.query(
    `DELETE FROM instalacao_custos WHERE "registroId" IN (
       SELECT id FROM instalacao_registros WHERE "instalacaoId" IN (${INSTALACOES_E2E}))`,
    c,
  );
  await client.query(
    `DELETE FROM instalacao_registros WHERE "instalacaoId" IN (${INSTALACOES_E2E})`,
    c,
  );
  await client.query(
    `DELETE FROM instalacao_auditorias WHERE "instalacaoId" IN (${INSTALACOES_E2E})`,
    c,
  );
  await client.query(
    `DELETE FROM instalacoes WHERE "clienteId" IN (${CLIENTES_E2E})`,
    c,
  );

  // ── Propostas (e tudo que pende delas) ──────────────────────────────────
  await client.query(
    `UPDATE propostas SET "currentRevisionId" = NULL
      WHERE "clienteId" IN (${CLIENTES_E2E})`,
    c,
  );
  await client.query(
    `DELETE FROM proposta_itens WHERE "secaoId" IN (
       SELECT id FROM proposta_secoes WHERE "revisaoId" IN (
         SELECT id FROM proposta_revisoes WHERE "propostaId" IN (${PROPOSTAS_E2E})))`,
    c,
  );
  await client.query(
    `DELETE FROM proposta_secoes WHERE "revisaoId" IN (
       SELECT id FROM proposta_revisoes WHERE "propostaId" IN (${PROPOSTAS_E2E}))`,
    c,
  );
  await client.query(
    `DELETE FROM proposta_revisoes WHERE "propostaId" IN (${PROPOSTAS_E2E})`,
    c,
  );
  await client.query(
    `DELETE FROM proposta_servicos WHERE "propostaId" IN (${PROPOSTAS_E2E})`,
    c,
  );
  await client.query(
    `DELETE FROM proposta_auditorias WHERE "propostaId" IN (${PROPOSTAS_E2E})`,
    c,
  );
  await client.query(
    `DELETE FROM propostas WHERE "clienteId" IN (${CLIENTES_E2E})`,
    c,
  );

  // ── Itens de proposta REAL que referenciem produto de teste ─────────────
  // Sem isto o Restrict de PropostaItem.produtoId barraria o DELETE abaixo.
  // Na prática só acontece se alguém montar uma proposta manual com um produto
  // E2E; a limpeza precisa ser correta mesmo nesse caso.
  await client.query(
    `DELETE FROM proposta_itens WHERE "produtoId" IN (
       SELECT id FROM produtos WHERE codigo LIKE $1)`,
    p,
  );

  // ── Cadastros base ──────────────────────────────────────────────────────
  await client.query(`DELETE FROM produtos WHERE codigo LIKE $1`, p);
  await client.query(`DELETE FROM clientes WHERE nome LIKE $1`, c);

  // ── Usuários ────────────────────────────────────────────────────────────
  // Por ÚLTIMO, e agora por TRÊS motivos (Sprint 4.2, ADR-0410): além de
  // `Instalacao.tecnicoResponsavelId` e `InstalacaoRegistro.tecnicoId`, a
  // `Proposta.vendedorId` também virou Restrict — antes era SET NULL, e apagar
  // um vendedor zerava o vínculo em silêncio. Instalações E propostas precisam
  // ter saído antes. A ordem acima já garante isso; este comentário existe para
  // que ninguém a reordene sem perceber a dependência nova.
  //
  // Efeito colateral positivo: vendedores criados por teste passam a ser
  // varridos. Antes nenhum era criado — se fosse, viraria resíduo permanente.
  await client.query(`DELETE FROM usuarios WHERE nome LIKE $1`, [MARCADOR_USUARIO]);
}

/**
 * Apaga o resíduo E2E e **prova** que não sobrou nada.
 *
 * A recontagem é a checagem automatizada exigida pela Sprint: se qualquer
 * marcador sobreviver, esta função lança — e um `globalTeardown` que lança
 * derruba a execução do Playwright. É o único lugar onde a asserção pode rodar,
 * já que nenhum teste executa depois dela.
 */
export async function limparResiduosE2E(): Promise<ResultadoLimpeza> {
  const databaseUrl = validarAmbiente();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const antes = await contar(client);

    await client.query("BEGIN");
    try {
      await apagar(client);
      await client.query("COMMIT");
    } catch (erro) {
      await client.query("ROLLBACK");
      throw erro;
    }

    const depois = await contar(client);
    const sobrou = Object.entries(depois).filter(([, n]) => n > 0);
    if (sobrou.length > 0) {
      throw new Error(
        "[limpeza E2E] Resíduo remanescente após a limpeza: " +
          sobrou.map(([tabela, n]) => `${tabela}=${n}`).join(", "),
      );
    }

    return { antes, depois };
  } finally {
    await client.end();
  }
}

/** Contagem avulsa, para conferência manual (usada na implantação da 4.0.3). */
export async function contarResiduosE2E(): Promise<ContagemResiduos> {
  const databaseUrl = validarAmbiente();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    return await contar(client);
  } finally {
    await client.end();
  }
}
