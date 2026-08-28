/**
 * Gate visual manual do contrato Rev. 4 (Sprint 4.4 / Release 1.7.0).
 *
 * Nenhum teste automatizado prova fidelidade de fonte, margem ou layout — isso
 * é inspeção humana no Microsoft Word (ADR-0330). Este script só PRODUZ os três
 * documentos que o gate exige, pelo **pipeline real** de produção
 * (`getPropostaPdfData` → `montarContratoTemplateDTO` → `renderContratoDocx`),
 * sem nenhum atalho de renderização:
 *
 *   1. `1-historico-rev3.docx` — revisão EMITIDA antes da Sprint 4.4, sem
 *      carimbo de versão. Prova que o fallback histórico continua entregando o
 *      texto jurídico da época.
 *   2. `2-rascunho-rev4.docx`  — RASCUNHO, sem carimbo. Resolve para a VIGENTE
 *      (ADR-0415, regra corrigida na T15.1): a pré-visualização já é a Rev. 4.
 *   3. `3-emitido-rev4.docx`   — a MESMA proposta depois de emitida, agora com
 *      `templateContratoVersao = "rev4"` carimbado.
 *
 * (2) e (3) têm de sair **byte a byte idênticos**: o texto jurídico não muda
 * entre pré-visualizar e emitir. O script verifica isso e falha se divergir.
 *
 * A proposta usada em (2)/(3) é criada e **APAGADA no fim** — o gate não deixa
 * resíduo no banco. O `finally` roda mesmo se a verificação falhar.
 *
 * Uso: `npx tsx scripts/gate-contrato-rev4.ts`
 */
import "dotenv/config";

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  montarContratoTemplateDTO,
  validarGeracaoContrato,
} from "@/features/propostas/docx/contrato.mapper";
import { renderContratoDocx } from "@/features/propostas/docx/render";
import { prisma } from "@/infrastructure/database";
import { getPropostaPdfData } from "@/services/proposta-pdf.service";
import { criarPropostaCompleta, emitirProposta } from "@/services/proposta.service";

const SAIDA = path.join(process.cwd(), "tmp", "gate-contrato-1.7.0");

/** Roda exatamente o que a rota `/propostas/[id]/contrato` roda. */
async function gerarContrato(propostaId: string) {
  const dto = await getPropostaPdfData(propostaId);
  if (!dto) throw new Error(`Proposta ${propostaId} não encontrada.`);

  const faltando = validarGeracaoContrato(dto, dto.templateContratoVersao);
  if (faltando) throw new Error(`Guarda bloqueou a geração: ${faltando}`);

  return {
    versao: dto.templateContratoVersao,
    numero: dto.numero,
    revisao: dto.revisao,
    buffer: renderContratoDocx(montarContratoTemplateDTO(dto), dto.templateContratoVersao),
  };
}

function salvar(nome: string, buffer: Buffer) {
  const destino = path.join(SAIDA, nome);
  writeFileSync(destino, new Uint8Array(buffer));
  const sha = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  console.log(`  → ${nome}  ${buffer.byteLength} bytes  sha256:${sha}…`);
  return sha;
}

async function main() {
  mkdirSync(SAIDA, { recursive: true });
  console.log(`Saída: ${SAIDA}\n`);

  // ── 1. Histórico: emitida ANTES da coluna existir, portanto sem carimbo ────
  const historica = await prisma.proposta.findFirst({
    where: {
      currentRevision: { emittedAt: { not: null }, templateContratoVersao: null },
    },
    orderBy: { proposalNumber: "desc" },
    select: { id: true, proposalNumber: true },
  });
  if (!historica) {
    throw new Error(
      "Nenhuma revisão emitida SEM carimbo no banco — sem ela o caso histórico " +
        "não pode ser provado. Emita uma proposta antes da migration ou restaure " +
        "um dump anterior à Sprint 4.4.",
    );
  }
  console.log(`1. Histórico — proposta ${historica.proposalNumber} (carimbo nulo)`);
  const doc1 = await gerarContrato(historica.id);
  if (doc1.versao !== "rev3") {
    throw new Error(`Esperava rev3 no caso histórico, veio ${doc1.versao}.`);
  }
  salvar("1-historico-rev3.docx", doc1.buffer);

  // ── 2/3. Rascunho e emissão da MESMA proposta ─────────────────────────────
  const cliente = await prisma.cliente.findFirstOrThrow({
    where: { ativo: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, nome: true },
  });
  const produto = await prisma.produto.findFirstOrThrow({
    where: { ativo: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, valorProduto: true, valorServico: true },
  });

  let gateId: string | null = null;
  try {
    const criada = await criarPropostaCompleta({
      clienteId: cliente.id,
      vendedorId: null,
      nomeProjeto: "GATE 1.7.0 — contrato Rev. 4",
      modelo: "COMERCIAL",
      validadeDias: 15,
      obsInternas: null,
      obsProposta: null,
      formaPagamento: "50% na assinatura e 50% na entrega",
      prazoExecucaoDiasUteis: 30,
      valorParcelaFinal: 3000,
      observacoesAceite: "Aceite condicionado à liberação do local pelo CONTRATANTE.",
      secoes: [
        {
          nome: "Automação",
          itens: [
            {
              produtoId: produto.id,
              quantidade: 2,
              valorProduto: Number(produto.valorProduto),
              valorServico: Number(produto.valorServico),
            },
          ],
        },
      ],
    });
    gateId = criada.id;
    console.log(
      `\n2. Rascunho — proposta ${criada.proposalNumber} (cliente: ${cliente.nome})`,
    );

    const doc2 = await gerarContrato(gateId);
    if (doc2.versao !== "rev4") {
      throw new Error(`Rascunho deveria resolver para rev4, veio ${doc2.versao}.`);
    }
    const sha2 = salvar("2-rascunho-rev4.docx", doc2.buffer);

    await emitirProposta(gateId);
    const carimbo = await prisma.proposta.findUniqueOrThrow({
      where: { id: gateId },
      select: { currentRevision: { select: { templateContratoVersao: true } } },
    });
    console.log(
      `\n3. Emitida — carimbo gravado: ${carimbo.currentRevision?.templateContratoVersao}`,
    );

    const doc3 = await gerarContrato(gateId);
    if (doc3.versao !== "rev4") {
      throw new Error(`Emitida deveria ser rev4, veio ${doc3.versao}.`);
    }
    const sha3 = salvar("3-emitido-rev4.docx", doc3.buffer);

    // A invariante que a T15.1 existe para garantir.
    if (sha2 !== sha3 || !doc2.buffer.equals(doc3.buffer)) {
      throw new Error(
        "DIVERGÊNCIA: o contrato mudou entre a pré-visualização e a emissão.",
      );
    }
    console.log("\n✓ rascunho == emitido, byte a byte — o texto jurídico não mudou.");
  } finally {
    if (gateId) {
      // A proposta do gate não pode ficar no banco: `onDelete: Cascade` leva
      // revisões, conteúdo e itens junto.
      await prisma.proposta.delete({ where: { id: gateId } });
      console.log("✓ proposta do gate removida — sem resíduo no banco.");
    }
  }
}

main()
  .catch((erro) => {
    console.error("\nFALHOU:", erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
