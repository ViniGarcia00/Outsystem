import "dotenv/config";

import { prisma } from "@/infrastructure/database";

/**
 * Auditoria da migração Vendedor/Tecnico → Usuario (Sprint 4.2, ADR-0410).
 *
 * Roda nas DUAS pontas: antes da M1 (quando `usuarios` ainda não existe) e
 * depois da M4 (quando `vendedores` e `tecnicos` não existem mais). Por isso usa
 * SQL bruto com detecção de tabela — o cliente Prisma gerado só conhece uma das
 * duas fases por vez, e um `prisma.vendedor.count()` nem compilaria depois do
 * drop.
 *
 * A saída é JSON estável e ordenada, para `diff` direto entre as duas execuções.
 * É ela que prova "nenhum vínculo perdido": uma migration não é reexecutável
 * dentro de uma suíte de teste, então a prova é a guarda dentro da própria
 * migration somada a esta comparação, registrada no `PROJECT_HISTORY.md`.
 *
 * Uso:
 *   npx tsx scripts/db/audit-usuarios.ts > /tmp/audit-pre.json
 */

async function tabelaExiste(nome: string): Promise<boolean> {
  const r = await prisma.$queryRawUnsafe<{ existe: boolean }[]>(
    `SELECT to_regclass($1) IS NOT NULL AS existe`,
    `public.${nome}`,
  );
  return r[0]?.existe ?? false;
}

async function contar(sql: string): Promise<number> {
  const r = await prisma.$queryRawUnsafe<{ n: bigint }[]>(sql);
  return Number(r[0]?.n ?? 0);
}

async function nomes(tabela: string): Promise<string[]> {
  const r = await prisma.$queryRawUnsafe<{ nome: string }[]>(
    `SELECT nome FROM "${tabela}" ORDER BY nome`,
  );
  return r.map((x) => x.nome);
}

async function main() {
  const temVendedores = await tabelaExiste("vendedores");
  const temTecnicos = await tabelaExiste("tecnicos");
  const temUsuarios = await tabelaExiste("usuarios");

  const cadastros = {
    vendedores: temVendedores
      ? await contar(`SELECT count(*) n FROM vendedores`)
      : null,
    tecnicos: temTecnicos
      ? await contar(`SELECT count(*) n FROM tecnicos`)
      : null,
    usuarios: temUsuarios
      ? await contar(`SELECT count(*) n FROM usuarios`)
      : null,
  };

  const listas = {
    vendedores: temVendedores ? await nomes("vendedores") : null,
    tecnicos: temTecnicos ? await nomes("tecnicos") : null,
    usuarios: temUsuarios
      ? await prisma.$queryRawUnsafe<
          {
            id: string;
            nome: string;
            ativo: boolean;
            ehVendedor: boolean;
            ehTecnico: boolean;
          }[]
        >(
          `SELECT id, nome, ativo, "ehVendedor", "ehTecnico"
             FROM usuarios ORDER BY nome`,
        )
      : null,
  };

  // Os vínculos NÃO dependem de qual cadastro existe: as três colunas têm o
  // mesmo nome antes e depois da migração. É exatamente esse o ponto do R1 —
  // muda a tabela referenciada, nunca o valor da coluna.
  const vinculos = {
    propostasComVendedor: await contar(
      `SELECT count(*) n FROM propostas WHERE "vendedorId" IS NOT NULL`,
    ),
    instalacoesComTecnico: await contar(
      `SELECT count(*) n FROM instalacoes WHERE "tecnicoResponsavelId" IS NOT NULL`,
    ),
    registros: await contar(`SELECT count(*) n FROM instalacao_registros`),
  };

  // A prova da cronologia: o par (vínculo, snapshot) de cada registro. O
  // `tecnicoId` PODE mudar (a M4 reponta o vínculo aprovado); o
  // `responsavelNome` NÃO pode, nunca.
  const cronologia = await prisma.$queryRawUnsafe<
    { id: string; tecnicoId: string; responsavelNome: string }[]
  >(
    `SELECT id, "tecnicoId", "responsavelNome"
       FROM instalacao_registros ORDER BY "aconteceuEm", id`,
  );

  console.log(
    JSON.stringify({ cadastros, listas, vinculos, cronologia }, null, 2),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
