import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";

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
  /** Anexos de registro (Sprint 4.3). Contados antes dos registros. */
  anexos: number;
  produtos: number;
  propostas: number;
  instalacoes: number;
  registros: number;
  custos: number;
  usuarios: number;
  // ── Pós-venda (Sprint 4.6) ────────────────────────────────────────────────
  // Doze tabelas novas (seis por processo). Contadas separadamente das de
  // Instalações porque são agregados distintos: um resíduo de Troca não deve
  // aparecer como resíduo de Instalação no relatório de saída.
  //
  // As DUAS de auditoria ficam fora desta contagem — são apagadas em `apagar()`,
  // mas não entram na asserção de resíduo. É o mesmo tratamento que
  // `instalacao_auditorias` e `proposta_auditorias` já recebiam: a auditoria só
  // existe pendurada numa raiz que já é contada, então contá-la seria redundante.
  trocas: number;
  trocaItens: number;
  trocaRegistros: number;
  trocaCustos: number;
  trocaAnexos: number;
  ordensServico: number;
  osItens: number;
  osRegistros: number;
  osCustos: number;
  osAnexos: number;
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

/**
 * Raiz de uploads, RE-DERIVADA do ambiente (Sprint 4.3, ADR-0414).
 *
 * ⚠️ **Duplicação deliberada de `src/infrastructure/storage/paths.ts`.** Este
 * módulo não pode importar de `src/` (ADR-0403), então a mesma regra —
 * `UPLOAD_PATH`, ou `<STORAGE_PATH>/uploads`, com `./storage` como padrão —
 * aparece escrita duas vezes. É o preço de manter a ferramenta de teste fora da
 * aplicação; o que compensa o risco é a guarda de contenção abaixo.
 */
function raizDeUploads(): string {
  const upload = process.env.UPLOAD_PATH?.trim();
  if (upload) return path.resolve(upload);
  const storage = process.env.STORAGE_PATH?.trim() || "./storage";
  return path.resolve(storage, "uploads");
}

/**
 * Resolve um alvo e **prova** que ele está contido na raiz, antes de qualquer
 * remoção. Lança em vez de devolver caminho suspeito.
 *
 * Recusa também o caminho igual à própria raiz: um `rm -r` na raiz apagaria o
 * logo da empresa e tudo o mais que vive lá.
 */
function alvoDentroDaRaiz(raiz: string, ...segmentos: string[]): string {
  const normalizada = path.resolve(raiz);
  const alvo = path.resolve(normalizada, ...segmentos);

  if (alvo === normalizada) {
    throw new Error(
      "[limpeza E2E] Recusado: alvo é a própria raiz de uploads. " +
        "A rotina remove pastas de instalações, nunca a raiz.",
    );
  }
  if (!alvo.startsWith(normalizada + path.sep)) {
    throw new Error(
      `[limpeza E2E] Recusado: alvo "${alvo}" está fora da raiz "${normalizada}".`,
    );
  }
  return alvo;
}

/**
 * Remove as pastas de anexos das instalações E2E.
 *
 * Roda **depois** do commit do banco, pela mesma razão do service: falhar aqui
 * deixa arquivo órfão (tolerado); falhar antes deixaria linha sem arquivo.
 *
 * Nunca é um `rm -r` sobre caminho não validado — cada alvo passa por
 * `alvoDentroDaRaiz`, e um id adulterado faz a rotina abortar.
 */
/**
 * Uma pasta de agregado a remover, já quebrada em segmentos.
 *
 * Existe como estrutura — e não como caminho pronto — para que TODO segmento
 * passe por `alvoDentroDaRaiz`. Montar a string antes tiraria a validação do
 * caminho crítico, que é exatamente onde ela precisa estar.
 */
interface PastaAlvo {
  segmentos: string[];
}

async function apagarPastas(alvos: PastaAlvo[]): Promise<{
  removidas: number;
  restantes: string[];
}> {
  const raiz = raizDeUploads();
  let removidas = 0;

  for (const { segmentos } of alvos) {
    const alvo = alvoDentroDaRaiz(raiz, ...segmentos);
    if (existsSync(alvo)) {
      await rm(alvo, { recursive: true, force: true });
      removidas++;
    }
  }

  // A verificação é a recontagem, agora também em disco.
  const restantes = alvos
    .map(({ segmentos }) => alvoDentroDaRaiz(raiz, ...segmentos))
    .filter((alvo) => existsSync(alvo));

  return { removidas, restantes };
}

/** Propostas e instalações são "de teste" por pertencerem a um cliente de teste. */
const CLIENTES_E2E = `SELECT id FROM clientes WHERE nome LIKE $1`;
const PROPOSTAS_E2E = `SELECT id FROM propostas WHERE "clienteId" IN (${CLIENTES_E2E})`;
const INSTALACOES_E2E = `SELECT id FROM instalacoes WHERE "clienteId" IN (${CLIENTES_E2E})`;

/**
 * Pós-venda (Sprint 4.6). Troca e OS são "de teste" pelo mesmo critério:
 * pertencem a um cliente de teste.
 *
 * `OS_E2E` inclui as ordens vinculadas a uma troca de teste **além** das do
 * próprio cliente. Na prática as duas coisas coincidem (o service exige que a
 * troca seja do mesmo cliente), mas a limpeza não deve depender de uma regra da
 * aplicação para saber o que apagar.
 */
const TROCAS_E2E = `SELECT id FROM pos_venda_trocas WHERE "clienteId" IN (${CLIENTES_E2E})`;
const OS_E2E = `SELECT id FROM pos_venda_ordens_servico
   WHERE "clienteId" IN (${CLIENTES_E2E})
      OR "trocaAntecipadaId" IN (${TROCAS_E2E})`;
const TROCA_REGISTROS_E2E = `SELECT id FROM pos_venda_troca_registros WHERE "trocaAntecipadaId" IN (${TROCAS_E2E})`;
const OS_REGISTROS_E2E = `SELECT id FROM pos_venda_os_registros WHERE "ordemServicoId" IN (${OS_E2E})`;

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
       (SELECT count(*) FROM instalacao_registro_anexos
          WHERE "registroId" IN (
            SELECT id FROM instalacao_registros
             WHERE "instalacaoId" IN (${INSTALACOES_E2E})
          )) AS anexos,
       (SELECT count(*) FROM usuarios WHERE nome LIKE $3) AS usuarios,
       (SELECT count(*) FROM pos_venda_trocas
          WHERE "clienteId" IN (${CLIENTES_E2E})) AS trocas,
       (SELECT count(*) FROM pos_venda_troca_itens
          WHERE "trocaAntecipadaId" IN (${TROCAS_E2E})) AS troca_itens,
       (SELECT count(*) FROM pos_venda_troca_registros
          WHERE "trocaAntecipadaId" IN (${TROCAS_E2E})) AS troca_registros,
       (SELECT count(*) FROM pos_venda_troca_custos
          WHERE "registroId" IN (${TROCA_REGISTROS_E2E})) AS troca_custos,
       (SELECT count(*) FROM pos_venda_troca_anexos
          WHERE "registroId" IN (${TROCA_REGISTROS_E2E})) AS troca_anexos,
       (SELECT count(*) FROM pos_venda_ordens_servico
          WHERE id IN (${OS_E2E})) AS ordens_servico,
       (SELECT count(*) FROM pos_venda_os_itens
          WHERE "ordemServicoId" IN (${OS_E2E})) AS os_itens,
       (SELECT count(*) FROM pos_venda_os_registros
          WHERE "ordemServicoId" IN (${OS_E2E})) AS os_registros,
       (SELECT count(*) FROM pos_venda_os_custos
          WHERE "registroId" IN (${OS_REGISTROS_E2E})) AS os_custos,
       (SELECT count(*) FROM pos_venda_os_anexos
          WHERE "registroId" IN (${OS_REGISTROS_E2E})) AS os_anexos`,
    [MARCADOR_CLIENTE, MARCADOR_PRODUTO, MARCADOR_USUARIO],
  );
  const r = rows[0];
  return {
    clientes: Number(r.clientes),
    anexos: Number(r.anexos),
    produtos: Number(r.produtos),
    propostas: Number(r.propostas),
    instalacoes: Number(r.instalacoes),
    registros: Number(r.registros),
    custos: Number(r.custos),
    usuarios: Number(r.usuarios),
    trocas: Number(r.trocas),
    trocaItens: Number(r.troca_itens),
    trocaRegistros: Number(r.troca_registros),
    trocaCustos: Number(r.troca_custos),
    trocaAnexos: Number(r.troca_anexos),
    ordensServico: Number(r.ordens_servico),
    osItens: Number(r.os_itens),
    osRegistros: Number(r.os_registros),
    osCustos: Number(r.os_custos),
    osAnexos: Number(r.os_anexos),
  };
}

/**
 * Ordem de exclusão explícita. **Não confiar em cascade** onde há `Restrict`:
 *
 *   Instalacao.propostaId    → Restrict  ⇒ instalações antes de propostas
 *   PropostaItem.produtoId   → Restrict  ⇒ itens antes de produtos
 *   Usuario → Restrict       ⇒ usuários por último — SETE relações apontam
 *                              para ele desde a Sprint 4.6:
 *                              Proposta.vendedorId,
 *                              Instalacao.tecnicoResponsavelId,
 *                              InstalacaoRegistro.tecnicoId,
 *                              TrocaAntecipada.responsavelId,
 *                              TrocaAntecipadaRegistro.responsavelId,
 *                              OrdemServicoPosVenda.responsavelId e
 *                              OrdemServicoPosVendaRegistro.responsavelId
 *   OS.trocaAntecipadaId     → Restrict  ⇒ ORDENS DE SERVIÇO antes das TROCAS
 *   Item de pós-venda → Produto → Restrict ⇒ itens antes de produtos
 *
 * `propostas.currentRevisionId` aponta para `proposta_revisoes`; o vínculo é
 * zerado antes de apagar as revisões, senão a FK bloqueia.
 */
async function apagar(client: Client): Promise<void> {
  const c = [MARCADOR_CLIENTE];
  const p = [MARCADOR_PRODUTO];

  // ── Pós-venda (Sprint 4.6) ──────────────────────────────────────────────
  //
  // ORDEM DE SERVIÇO ANTES DA TROCA: `OrdemServicoPosVenda.trocaAntecipadaId`
  // é RESTRICT, e apagar a troca primeiro seria barrado pelo banco.
  //
  // Dentro de cada agregado, filhos antes da raiz. As FKs têm CASCADE, mas a
  // ordem explícita é a regra do ADR-0403: não confiar em cascade onde a ordem
  // pode ser afirmada — e é o que torna a recontagem uma verificação de
  // verdade, e não uma tautologia.
  await client.query(
    `DELETE FROM pos_venda_os_anexos WHERE "registroId" IN (${OS_REGISTROS_E2E})`,
    c,
  );
  await client.query(
    `DELETE FROM pos_venda_os_custos WHERE "registroId" IN (${OS_REGISTROS_E2E})`,
    c,
  );
  await client.query(
    `DELETE FROM pos_venda_os_registros WHERE "ordemServicoId" IN (${OS_E2E})`,
    c,
  );
  await client.query(
    `DELETE FROM pos_venda_os_itens WHERE "ordemServicoId" IN (${OS_E2E})`,
    c,
  );
  await client.query(
    `DELETE FROM pos_venda_os_auditorias WHERE "ordemServicoId" IN (${OS_E2E})`,
    c,
  );
  await client.query(`DELETE FROM pos_venda_ordens_servico WHERE id IN (${OS_E2E})`, c);

  await client.query(
    `DELETE FROM pos_venda_troca_anexos WHERE "registroId" IN (${TROCA_REGISTROS_E2E})`,
    c,
  );
  await client.query(
    `DELETE FROM pos_venda_troca_custos WHERE "registroId" IN (${TROCA_REGISTROS_E2E})`,
    c,
  );
  await client.query(
    `DELETE FROM pos_venda_troca_registros WHERE "trocaAntecipadaId" IN (${TROCAS_E2E})`,
    c,
  );
  await client.query(
    `DELETE FROM pos_venda_troca_itens WHERE "trocaAntecipadaId" IN (${TROCAS_E2E})`,
    c,
  );
  await client.query(
    `DELETE FROM pos_venda_troca_auditorias WHERE "trocaAntecipadaId" IN (${TROCAS_E2E})`,
    c,
  );
  await client.query(`DELETE FROM pos_venda_trocas WHERE "clienteId" IN (${CLIENTES_E2E})`, c);

  // ── Instalações (e tudo que pende delas) ────────────────────────────────
  // Anexos ANTES dos registros: a FK tem CASCADE, mas a ordem explícita é a
  // regra do ADR-0403 — não confiar em cascade onde a ordem pode ser afirmada.
  await client.query(
    `DELETE FROM instalacao_registro_anexos WHERE "registroId" IN (
       SELECT id FROM instalacao_registros WHERE "instalacaoId" IN (${INSTALACOES_E2E}))`,
    c,
  );
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

  // ── Itens de PÓS-VENDA que referenciem produto de teste ────────────────
  // Mesma razão do bloco acima: `produtoId` é RESTRICT nos dois itens novos.
  // Na prática só acontece se alguém montar uma troca/OS manual com um produto
  // E2E fora de um cliente E2E; a limpeza precisa ser correta mesmo nesse caso.
  await client.query(
    `DELETE FROM pos_venda_troca_itens WHERE "produtoId" IN (
       SELECT id FROM produtos WHERE codigo LIKE $1)`,
    p,
  );
  await client.query(
    `DELETE FROM pos_venda_os_itens WHERE "produtoId" IN (
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

    // Os ids dos agregados E2E precisam ser lidos ANTES do DELETE — depois dele
    // não há como saber quais pastas remover.
    //
    // Três origens de pasta física desde a Sprint 4.6: instalações,
    // trocas antecipadas e ordens de serviço. Cada uma tem raiz própria em
    // disco (`instalacoes/`, `pos-venda/trocas/`, `pos-venda/ordens-servico/`),
    // e os segmentos são montados aqui e validados um a um por
    // `alvoDentroDaRaiz`.
    const [instalacoes, trocas, ordens] = await Promise.all([
      client.query<{ id: string }>(
        `SELECT id FROM instalacoes WHERE "clienteId" IN (${CLIENTES_E2E})`,
        [MARCADOR_CLIENTE],
      ),
      client.query<{ id: string }>(TROCAS_E2E, [MARCADOR_CLIENTE]),
      client.query<{ id: string }>(OS_E2E, [MARCADOR_CLIENTE]),
    ]);

    const pastas: PastaAlvo[] = [
      ...instalacoes.rows.map((r) => ({ segmentos: ["instalacoes", r.id] })),
      ...trocas.rows.map((r) => ({
        segmentos: ["pos-venda", "trocas", r.id],
      })),
      ...ordens.rows.map((r) => ({
        segmentos: ["pos-venda", "ordens-servico", r.id],
      })),
    ];

    await client.query("BEGIN");
    try {
      await apagar(client);
      await client.query("COMMIT");
    } catch (erro) {
      await client.query("ROLLBACK");
      throw erro;
    }

    // Só depois do COMMIT: falhar aqui deixa arquivo órfão, que é o lado
    // tolerado; o contrário deixaria linha apontando para arquivo removido.
    const { removidas, restantes } = await apagarPastas(pastas);
    if (restantes.length > 0) {
      throw new Error(
        "[limpeza E2E] Pastas de anexos remanescentes após a limpeza: " +
          restantes.join(", "),
      );
    }
    if (removidas > 0) {
      console.log(`[limpeza E2E] pastas de anexos removidas: ${removidas}`);
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
