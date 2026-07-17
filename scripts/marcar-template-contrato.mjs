/**
 * Marcação SELETIVA do template oficial do contrato (Sprint 3.1).
 *
 * Entrada:  public/templates/contrato/contrato-outmat.oficial.docx  (oficial, [PLACEHOLDERS])
 * Saída:    public/templates/contrato/contrato-outmat.docx         (marcado, {tags})
 *
 * Uso único — a saída é commitada. Reexecutar só se o jurídico enviar um
 * template novo.
 *
 * REGRA CRÍTICA (spec D3.1): `[Nº]` aparece 5× com 5 significados diferentes
 * (prazo de início, prazo de conclusão, prazo de aceite, multa %, nº da
 * proposta). Só o do Anexo II — precedido por "Proposta Comercial nº " — é
 * automático. Marcar todos com delimitadores `[ ]` produziria "multa de 1042%".
 *
 * SEGURANÇA: só o texto dentro de <w:t> é tocado. O script aborta se qualquer
 * outra parte do XML mudar, ou se as contagens divergirem do esperado.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import PizZip from "pizzip";

const DIR = path.join(process.cwd(), "public", "templates", "contrato");
const ENTRADA = path.join(DIR, "contrato-outmat.oficial.docx");
const SAIDA = path.join(DIR, "contrato-outmat.docx");

/** Placeholders únicos → tag. [texto exato no template, tag, ocorrências esperadas] */
const SIMPLES = [
  ["[NOME COMPLETO DO CLIENTE]", "{clienteNome}", 1],
  ["[CPF/CNPJ]", "{clienteDocumento}", 1],
  ["[ENDEREÇO DO CLIENTE]", "{clienteEndereco}", 1],
  ["[Nº DA PROPOSTA]", "{propostaNumero}", 1],
  ["[VALOR TOTAL]", "{valorTotal}", 1],
  ["[VALOR POR EXTENSO]", "{valorTotalExtenso}", 1],
  ["[DATA]", "{data}", 2],
  ["[OUTMAT]", "{empresaNome}", 1],
  ["[NOME DO CLIENTE]", "{clienteNome}", 1],
];

/** Remove o texto de dentro dos <w:t>, deixando só a estrutura do XML. */
const soEstrutura = (s) => s.replace(/(<w:t[^>]*>)([^<]*)(<\/w:t>)/g, "$1$3");
const conta = (s, sub) => s.split(sub).length - 1;

const zip = new PizZip(readFileSync(ENTRADA));
const antes = zip.file("word/document.xml").asText();
let xml = antes;

// Pré-condições: o template é o que esperamos.
if (conta(xml, "[Nº]") !== 5) {
  throw new Error(`Esperava 5 "[Nº]", achei ${conta(xml, "[Nº]")}. Template mudou?`);
}
for (const [ph, , n] of SIMPLES) {
  if (conta(xml, ph) !== n) {
    throw new Error(`Esperava ${n}× "${ph}", achei ${conta(xml, ph)}.`);
  }
}

/**
 * Remove realce (highlight) e itálico do run. No template oficial os
 * placeholders são realçados em amarelo e a instrução da forma de pagamento é
 * itálica — convenção de "preencha aqui". Sem isto, o valor PREENCHIDO herdaria
 * o realce e o contrato sairia com nome, CPF e valor pintados de amarelo. Só os
 * runs que viram tag do sistema são limpos; os placeholders manuais ([Nº],
 * [VALOR], [se houver]) mantêm o amarelo, sinalizando o que falta preencher.
 */
const limparRealce = (run) =>
  run
    .replace(/<w:highlightCs\s+w:val="[^"]*"\s*\/>/g, "")
    .replace(/<w:highlight\s+w:val="[^"]*"\s*\/>/g, "")
    .replace(/<w:iCs\/>/g, "")
    .replace(/<w:i\/>/g, "");

const contemTag = (s) => /\{[a-zA-Z]+\}/.test(s);

// 1) Processa run a run: substitui dentro do <w:t> e, se o run passou a conter
//    uma tag do sistema, limpa o realce/itálico da instrução.
xml = xml.replace(/<w:r\b[^>]*>.*?<\/w:r>/gs, (run) => {
  const tmatch = /<w:t[^>]*>([^<]*)<\/w:t>/.exec(run);
  if (!tmatch) return run;
  let txt = tmatch[1];
  for (const [ph, tag] of SIMPLES) txt = txt.split(ph).join(tag);
  // O bloco de instrução da forma de pagamento (cláusula 2.2) é longo e
  // variável; casa pelo prefixo e é trocado por inteiro.
  if (txt.startsWith("[DESCREVA AQUI A FORMA DE PAGAMENTO")) txt = "{formaPagamento}";
  let novo = run.replace(
    /(<w:t[^>]*>)[^<]*(<\/w:t>)/,
    (_m, open, close) => open + txt + close,
  );
  if (contemTag(txt)) novo = limparRealce(novo);
  return novo;
});

// 2) O ÚNICO [Nº] automático: o do Anexo II, precedido por "Proposta Comercial nº ".
//    Sem flag /g — substitui só a primeira ocorrência que casar. A da cláusula
//    1.2 já virou {propostaNumero} no passo 1, então não casa aqui. Limpa o
//    realce do run inteiro do Anexo II junto.
const antesNumero = xml;
xml = xml.replace(
  /(Proposta Comercial nº\s*<\/w:t>(?:(?!<w:r\b).)*?)(<w:r\b[^>]*>(?:(?!<\/w:r>).)*?)\[Nº\]/s,
  (_m, pre, runInicio) => `${pre}${limparRealce(runInicio)}{propostaNumero}`,
);
if (xml === antesNumero) throw new Error("Não achei o [Nº] do Anexo II.");

// Pós-condições.
if (conta(xml, "[Nº]") !== 4) {
  throw new Error(`Deviam sobrar 4 "[Nº]" manuais, sobraram ${conta(xml, "[Nº]")}.`);
}
if (conta(xml, "[VALOR]") !== 1) throw new Error("[VALOR] do Anexo II sumiu.");
if (conta(xml, "[se houver]") !== 1) throw new Error("[se houver] sumiu.");
if (conta(xml, "{formaPagamento}") !== 1) throw new Error("{formaPagamento} não foi marcado.");

// Invariante de formatação: removendo de AMBOS o texto dos <w:t> e todos os
// realces/itálicos, o resto tem de ser byte a byte idêntico. Isso prova que as
// ÚNICAS mudanças foram (a) o texto e (b) a remoção de highlight/itálico —
// nunca fonte, tamanho, espaçamento, alinhamento, numeração ou estrutura.
const semRealce = (s) =>
  soEstrutura(s)
    .replace(/<w:highlightCs\s+w:val="[^"]*"\s*\/>/g, "")
    .replace(/<w:highlight\s+w:val="[^"]*"\s*\/>/g, "")
    .replace(/<w:iCs\/>/g, "")
    .replace(/<w:i\/>/g, "");
if (semRealce(antes) !== semRealce(xml)) {
  throw new Error("Mudança além de texto/realce — formatação em risco. Abortado.");
}

// O realce dos manuais tem de sobreviver (o amarelo = "preencha aqui"); o dos
// campos automáticos tem de sair.
const highlights = (s) => (s.match(/<w:highlight\s+w:val=/g) ?? []).length;
if (highlights(xml) === 0) throw new Error("Todos os realces sumiram; os manuais deviam ficar.");
if (highlights(xml) >= highlights(antes)) {
  throw new Error("Nenhum realce foi removido; os campos automáticos sairiam amarelos.");
}

zip.file("word/document.xml", xml);
writeFileSync(SAIDA, zip.generate({ type: "nodebuffer", compression: "DEFLATE" }));

console.log("Template marcado:", SAIDA);
console.log("  4× [Nº] manuais, [VALOR] e [se houver] preservados literais e realçados");
console.log(`  realces: ${highlights(antes)} → ${highlights(xml)} (campos automáticos limpos)`);
console.log("  formatação (fonte/margem/estilo): idêntica");
