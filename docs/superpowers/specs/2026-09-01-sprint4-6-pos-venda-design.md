# Sprint 4.6 — Módulo Pós-venda: Troca Antecipada + Ordem de Serviço

Documento de design. Escrito **depois** da auditoria do repositório e **antes**
da implementação.

Versão alvo: **1.9.0** (módulo novo, aditivo — MINOR pela convenção do projeto,
que reservou MINOR para Sprints de módulo: 1.4.0 Instalações, 1.6.0 Anexos,
1.7.0 Contrato Rev. 4, 1.8.0 Sprint 4.5).

---

## 1. O problema

Produtos já instalados dão defeito. A Outmat costuma enviar o substituto
**antes** de receber o defeituoso, para não deixar o cliente parado. Hoje isso
vive no WhatsApp:

- ninguém sabe quantas peças ainda estão pendentes de devolução;
- o custo do motoboy/frete não é rastreado;
- o produto que volta pode ficar sem análise;
- o conhecimento sobre defeitos recorrentes se perde.

São **dois processos distintos**, que hoje o negócio confunde por acontecerem em
sequência:

| | Troca Antecipada | Ordem de Serviço de Pós-venda |
|---|---|---|
| Pergunta | "o defeituoso voltou?" | "qual era o defeito, e o que foi feito?" |
| Fecha quando | o retorno é resolvido | a análise/reparo termina |
| Existe sem a outra? | sim | **sim** |

Modelá-los como uma coisa só forçaria uma Troca a existir para toda análise
técnica, o que é falso: uma peça pode chegar para conserto sem nunca ter havido
envio antecipado.

## 2. O que este módulo NÃO faz

Fora de escopo, por decisão explícita — registrado no BACKLOG:

- **Estoque**: nada de baixa, reserva, entrada, saldo ou número de série.
- **Garantia**: sem prazo, cobertura, entidade `Garantia` ou exigência de NF.
- **Financeiro**: custos são informativos. Sem contas a pagar/receber, cobrança,
  reembolso ou baixa. `VALOR_PENDENTE` é status **operacional**, não financeiro.
- **Dashboard**: nenhum card novo nesta versão.
- **OS de instalação**: esta OS é de **pós-venda/manutenção de equipamentos**.
  Uma futura OS de instalação é outra entidade e não é preparada aqui.

## 3. Navegação

`Pós-venda` entra no menu principal **entre Instalações e Usuários** — é
operacional, como Instalações, e vem depois porque é o que acontece *depois* da
instalação. `mainNavigation` passa a ter oito itens; `navigation.test.ts` é
atualizado (a ordem é requisito travado por teste).

```
/pos-venda                              hub com dois cartões
/pos-venda/trocas-antecipadas           listagem
/pos-venda/trocas-antecipadas/nova      criação
/pos-venda/trocas-antecipadas/[id]      workspace
/pos-venda/ordens-de-servico            listagem
/pos-venda/ordens-de-servico/nova       criação
/pos-venda/ordens-de-servico/[id]       workspace
```

O hub mostra **apenas as duas opções que existem**. Nada de "em breve".

## 4. Modelagem

Doze tabelas novas, todas com prefixo `pos_venda_` — seis por processo (raiz,
itens, registros, custos, anexos e auditoria). Nenhuma tabela existente
muda de estrutura; as únicas alterações fora do módulo são o **lado inverso**
das relações com `clientes`, `produtos` e `usuarios` (que não geram DDL).

```
TrocaAntecipada  ──1:N──  TrocaAntecipadaItem
       │                        └── produtoId? (Restrict) | descricaoManual?
       ├──1:N── TrocaAntecipadaRegistro ──1:N── TrocaAntecipadaRegistroCusto
       │                │                └──1:N── TrocaAntecipadaRegistroAnexo
       ├──1:N── TrocaAntecipadaAuditoria
       └──0:1── OrdemServicoPosVenda      (unique em trocaAntecipadaId)

OrdemServicoPosVenda ──1:N── OrdemServicoPosVendaItem
       ├──1:N── OrdemServicoPosVendaRegistro ──1:N── ...Custo
       │                                     └──1:N── ...Anexo
       └──1:N── OrdemServicoPosVendaAuditoria
```

### 4.1 Decisões de modelagem

**Numeração própria por sequência do PostgreSQL, iniciando em 1001.** Duas
sequências independentes (`pos_venda_trocas_numero_seq`,
`pos_venda_ordens_servico_numero_seq`). Mesmo padrão do ADR-0201 e das
Instalações. Nunca `MAX(numero)+1`; nunca o `id` na tela.

**`origem` da OS é DERIVADA, não persistida.** `trocaAntecipadaId != null` já
responde a pergunta. Uma coluna `origem` seria um segundo lugar onde a mesma
verdade mora, e o dia em que ela divergir do vínculo não há como saber qual das
duas está certa. O tipo `OrigemOS` existe só em TypeScript, em `labels.ts`.

**Cardinalidade Troca ↔ OS: `@unique` em `OrdemServicoPosVenda.trocaAntecipadaId`.**
Uma Troca tem zero ou uma OS. É o que a Sprint pede, e a constraint do banco é a
única forma de a regra não depender de código. Múltiplas OS por Troca ficam no
BACKLOG — quando entrarem, o caminho é remover o `@unique`, migration aditiva.

**Item NÃO guarda snapshot de código/descrição do Produto.** Diferente de
`PropostaItem` (ADR-0207), que congela preço porque é documento comercial
assinável, o item de pós-venda não tem preço e não vai para documento nenhum: o
que interessa é *qual peça é esta*, e essa é uma pergunta sobre o cadastro
**atual**. Renomear um produto deve refletir na OS aberta. A FK é `Restrict`, e
o produto usado nunca é excluído.

**`produtoId` XOR `descricaoManual`.** Nunca os dois vazios. A regra vive em
`features/pos-venda/itens.ts` (módulo puro), é aplicada no Zod e **de novo** no
service — a segunda é a que vale, porque a primeira depende de quem chamou.

**Custos: uma enum, duas listas de exibição.** `CategoriaCustoPosVenda` reúne
`MOTOBOY, SEDEX, FRETE, VISITA, PECA, MATERIAL, TERCEIRIZACAO, OUTROS`. A
Troca oferece as cinco primeiras (envio); a OS oferece peça/frete/terceirização/
material/outros (reparo). Duas enums no banco obrigariam a duplicar o módulo de
cálculo e a tabela de rótulos para ganhar uma restrição que a UI já dá.

**Custos da Troca e da OS NÃO se somam.** São históricos independentes
(spec §36). Nenhum lugar do sistema exibe um total combinado, e criar a OS a
partir da Troca **não copia custo nenhum**.

**Quantidade pendente é DERIVADA**, nunca persistida:
`max(esperadaRetorno - devolvida, 0)`.

### 4.2 FKs e índices

| Relação | onDelete | Por quê |
|---|---|---|
| Troca → Cliente | `Restrict` | cadastro usado não some (padrão do projeto) |
| Troca → Usuario (responsável) | `Restrict` | idem; vínculo nunca é zerado em silêncio |
| Item → Produto | `Restrict` | idem |
| OS → Cliente / Usuario | `Restrict` | idem |
| OS → Troca | `Restrict` | apagar a Troca não pode arrastar a OS |
| Item/Registro/Auditoria → raiz | `Cascade` | são conteúdo do agregado |
| Custo/Anexo → Registro | `Cascade` | idem |

Índices: `numero` (unique), `clienteId`, `responsavelId`, `status`, `updatedAt`,
`trocaAntecipadaId` (vem do unique), e as FKs dos filhos. Não indexamos tudo —
`referencia` e `relatoInicial` ficam de fora porque a busca é em memória
(ADR-0402).

### 4.3 `Usuario.removeUsuario` precisa saber do módulo novo

`removeUsuario` conta hoje três relações. Com o Pós-venda passam a ser **sete**
(Troca, Registro da Troca, OS, Registro da OS). Sem isso, excluir um usuário
usado no Pós-venda devolveria erro cru de FK em vez da mensagem que orienta a
inativar. Correção legítima, dentro do escopo.

## 5. Regras de negócio

### 5.1 Status

Sem máquina de estados rígida — qualquer transição é permitida, como nas
Instalações. Cancelada e Finalizada são estados terminais **na UI** (o workspace
fica somente-leitura), nunca por exclusão de registro.

| Troca | OS |
|---|---|
| Aberta, Envio pendente, Devolução pendente, Em análise, Valor pendente, Finalizada, Cancelada | Aberta, Aguardando análise, Em análise, Em manutenção, Aguardando peça, Finalizada, Cancelada |

### 5.2 Finalização da Troca — confirmação forte, nunca bloqueio

Se existir item com `devolvida < esperadaRetorno`, a finalização exige
`confirmarPendencia: true`. Sem a confirmação o service recusa e **devolve a
lista de pendências**; a UI mostra um diálogo que enumera item por item. Nunca
é um bloqueio absoluto: existe produto perdido, acordo, cobrança futura e
decisão administrativa. `finalizadaEm` é carimbado.

### 5.3 Finalização da OS — exige informação técnica

A OS existe para registrar **o que era o defeito e o que foi feito**. Finalizar
sem nada disso deixaria exatamente o buraco que o módulo veio fechar. A regra é
a mais frouxa que ainda garante o registro:

> `diagnosticoConclusao` geral preenchido **OU** ao menos um item com
> `diagnosticoItem` ou `solucaoItem` preenchido.

Não é UX ruim: o campo geral é um textarea no próprio workspace, e a mensagem de
recusa diz exatamente o que falta. **Registrado no relatório pré-commit** por
ser a única regra que a spec deixou em aberto (§33).

### 5.4 Cancelamento

Troca e OS são canceladas, **nunca excluídas** — mesmo princípio do ADR-0203 e
do ADR-0400. Timeline, custos e anexos são preservados. `canceladaEm` carimbado,
motivo opcional na auditoria.

### 5.5 Criar OS a partir da Troca (implementado)

A automação opcional (§27) **entra**, porque é pequena e fechada: uma função de
service, uma transação, nenhuma sincronização.

- Copia `clienteId`, `trocaAntecipadaId`, referência com contexto, e os itens
  com `quantidadeDevolvida > 0` — `produtoId` preservado, ou `descricaoManual`.
- `quantidade` da OS = `quantidadeDevolvida` **no momento da criação**.
- Nenhum item devolvido ⇒ **não cria**, e explica por quê.
- Troca já com OS ⇒ recusa (o `@unique` é a garantia final).
- **Zero código de sincronização.** É por isso que o snapshot é seguro: não há
  o que desligar depois. Mudar a Troca não toca na OS, por construção.

## 6. Anexos

Mesma arquitetura homologada no ADR-0414, sem exceção:

- Route Handler para upload (Server Action tem limite de 1 MB de corpo);
- `UPLOAD_PATH`, caminho **relativo** no banco, separadores POSIX;
- nome físico gerado no servidor a partir do **MIME da allowlist**;
- nome original só como metadado, sanitizado;
- `resolveWithin` em todo acesso a disco;
- resolução pelo **agregado completo** (`troca/OS → registro → anexo`);
- exclusão apaga a **linha primeiro**, o arquivo depois (best effort);
- órfão em disco é tolerado e logado; linha sem arquivo é o estado a evitar.

Formatos: JPG, JPEG, PNG, WebP, PDF, DOC, DOCX, XLS, XLSX. **10 MB** por
arquivo, **10 anexos** por registro.

**Extração para `src/lib/anexos.ts`.** Os primitivos neutros de domínio
(allowlist de MIME, limites, `validarArquivo`, `nomeFisico`,
`sanitizarNomeOriginal`, `formatarTamanho`, `ACCEPT_ANEXO`, `segmentoSeguro`,
`caminhoRelativoSeguro`) saem de `features/instalacoes/anexos.ts` para
`src/lib/anexos.ts`. `features/instalacoes/anexos.ts` **re-exporta tudo** e
mantém seus próprios construtores de caminho — nenhum call site muda, nenhum
teste existente muda, e o Pós-venda não duplica a regra de segurança. É a
alternativa a ter a mesma allowlist escrita duas vezes, que foi o defeito que o
ADR-0402 já corrigiu na busca.

Caminhos:

```
pos-venda/trocas/<trocaId>/registros/<registroId>/<chave>.<ext>
pos-venda/ordens-servico/<osId>/registros/<registroId>/<chave>.<ext>
```

## 7. Busca e filtros

Busca em memória pela fonte única `@/utils/busca` (ADR-0402) — insensível a
caixa e a acento. Nenhuma normalização nova.

- **Troca**: número, cliente, referência, relato inicial, produto cadastrado,
  descrição manual, responsável, status.
- **OS**: número, cliente, referência, produto, descrição manual, diagnóstico,
  responsável, status, **número da Troca vinculada**.

Filtro mínimo: **Status**, em ambas. Sem dashboard analítico.

## 8. Componentização

Compartilhado (módulo `features/pos-venda/`, raiz):
`anexos.ts`, `custos.ts`, `itens.ts`, `labels.ts`, `anexos-editor.tsx`,
`custos-editor.tsx`, `resumo-custos.tsx`, `registro-dialog.tsx`,
`registro-card.tsx`, `timeline.tsx`, `cancelar-dialog.tsx`.

Os componentes compartilhados recebem a **URL base dos anexos** e as **opções de
categoria** por prop — não conhecem Troca nem OS. Isso é reuso concreto, não
abstração genérica: os dois submódulos têm literalmente a mesma timeline.

Domínio explícito e separado: `trocas/` e `ordens-servico/`, cada um com schema,
actions, listagem, formulário de criação e workspace próprios.

Reuso de fora do módulo, sem cópia:
`@/features/instalacoes/datas` (fuso fixo `America/Sao_Paulo` — declarar o fuso
duas vezes é o erro que `datas.ts` documenta), `@/features/propostas/cliente-autocomplete`,
`@/features/propostas/produto-autocomplete`, `@/features/usuarios` (papéis).

**Responsável usa o papel `ehTecnico`.** A spec proíbe criar role nova só para
isso, e pós-venda é trabalho técnico. Mesmas regras do ADR-0410: papel exigido
apenas em vínculo **novo ou alterado**; opções incluem os já vinculados, ainda
que indisponíveis.

## 9. Auditoria

`EventoPosVenda`: `CRIACAO, ALTERACAO, MUDANCA_STATUS, FINALIZACAO,
CANCELAMENTO, VINCULO`. Gravada na **mesma transação** da escrita, como
`PropostaAuditoria` e `InstalacaoAuditoria`. A timeline operacional
(`Registro`) **não** gera auditoria — são mecanismos separados (ADR-0401).

`VINCULO` registra, nos **dois** lados, a criação da OS a partir de uma Troca.

## 10. Testes

- **Unidade** (sem banco): labels e ordens, `itens.ts` (XOR, inteiros, ≥ 0,
  devolvida ≤ esperada, pendente, somas), `custos.ts`, `anexos.ts` (allowlist,
  caminhos, accept), schemas Zod dos dois submódulos, `navigation.test.ts`.
- **Integração** (PostgreSQL real): CRUD, status, finalização com e sem
  pendência, finalização da OS com e sem informação técnica, cancelamento,
  itens dos dois tipos, `devolvida > esperada` recusada, timeline e ordenação,
  custos e somas, anexos (upload/download/exclusão/limites/agregado cruzado),
  vínculo válido e inexistente, e o **teste crítico do snapshot** 7/7/5 → OS 5 →
  Troca 7/7/7 → OS continua 5.
- **E2E**: fechadura completa, interruptores 7/7, produto manual, OS manual
  obrigatória, OS com origem, botão Criar OS, anexos nos dois módulos.
- **Cleanup**: `e2e/support/limpeza.ts` passa a contar e apagar as doze tabelas
  novas e as pastas físicas dos dois submódulos. Resíduo zero em banco **e** em
  disco continua sendo condição de saída do `globalTeardown`.

## 11. ADRs previstos

- **ADR-0418** — Pós-venda: dois processos, entidades próprias, sem reuso de
  `Instalacao`.
- **ADR-0419** — Origem da OS derivada do vínculo; cardinalidade 0..1 por
  `@unique`; snapshot sem sincronização.
- **ADR-0420** — Finalização: confirmação forte na Troca, exigência técnica na
  OS.
- **ADR-0421** — `src/lib/anexos.ts` como fonte única dos primitivos de anexo.
