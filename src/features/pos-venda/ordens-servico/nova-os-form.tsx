"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Package, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CrudFormShell } from "@/components/app";
import {
  FormSection,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { descricaoDoItem } from "@/features/pos-venda/itens";
import { STATUS_OS_LABEL, STATUS_OS_ORDER } from "@/features/pos-venda/labels";
import {
  AdicionarProdutoDialog,
  type ProdutoEscolhido,
} from "@/features/pos-venda/produto-dialog";
import type { TrocaSuggestion } from "@/features/pos-venda/tipos";
import { listTrocasVinculaveisAction } from "@/features/pos-venda/trocas/actions";
import { ClienteAutocomplete } from "@/features/propostas/cliente-autocomplete";
import { UsuarioSelectField } from "@/features/usuarios";
import type { UsuarioOption } from "@/services/usuario.service";

import { criarOrdemServicoAction } from "./actions";
import { novaOSSchema, type NovaOSValues } from "./schema";

/**
 * Criação MANUAL de Ordem de Serviço de pós-venda — o fluxo OBRIGATÓRIO desta
 * Sprint (spec §24).
 *
 * A OS funciona completamente sem Troca Antecipada. Uma peça pode chegar para
 * conserto sem nunca ter havido envio antecipado, e é por isso que esta tela
 * não menciona Troca em lugar nenhum até o cliente ser escolhido.
 *
 * ── O VÍNCULO OPCIONAL (spec §26) ───────────────────────────────────────────
 * Depois de escolher o cliente, um `Select` simples oferece as trocas DELE que
 * ainda não têm OS. Filtrar pelo cliente é o que mantém a lista curta o
 * bastante para não virar um segundo buscador na tela; esconder o campo antes
 * disso é o que impede a tela de parecer que exige uma troca.
 *
 * Produtos entram JÁ na criação: uma OS de pós-venda nasce porque algo chegou
 * para análise, e uma OS sem produto não descreve trabalho nenhum.
 */

const STATUS_OPTIONS = STATUS_OS_ORDER.filter(
  (s) => s !== "CANCELADA" && s !== "FINALIZADA",
).map((value) => ({ value, label: STATUS_OS_LABEL[value] }));

/** Sentinela de "sem troca" — o Select do shadcn não aceita value vazio. */
const SEM_TROCA = "__none__";

interface LinhaNova {
  produtoId: string | null;
  produtoCodigo: string | null;
  produtoDescricao: string | null;
  descricaoManual: string;
  quantidade: number;
}

export function NovaOSForm({
  responsaveis,
}: {
  responsaveis: UsuarioOption[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [clienteLabel, setClienteLabel] = useState<string | null>(null);
  const [trocas, setTrocas] = useState<TrocaSuggestion[]>([]);
  const [linhas, setLinhas] = useState<LinhaNova[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<NovaOSValues>({
    resolver: zodResolver(novaOSSchema),
    defaultValues: {
      clienteId: "",
      trocaAntecipadaId: null,
      referencia: "",
      responsavelId: null,
      relatoInicial: "",
      status: "ABERTA",
      itens: [],
    },
  });

  const clienteIdAtual = useWatch({ control: form.control, name: "clienteId" });
  const trocaAtual = useWatch({
    control: form.control,
    name: "trocaAntecipadaId",
  });

  /**
   * Trocar o cliente **zera o vínculo**. Uma troca do cliente anterior não pode
   * seguir selecionada — o service recusaria (`TROCA_DE_OUTRO_CLIENTE`), mas
   * deixar o campo mostrando uma opção inválida até o submit seria mostrar ao
   * usuário um estado que não existe.
   */
  async function aoEscolherCliente(cliente: { id: string; label: string } | null) {
    form.setValue("clienteId", cliente?.id ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("trocaAntecipadaId", null, { shouldDirty: true });
    setClienteLabel(cliente?.label ?? null);
    setTrocas(cliente ? await listTrocasVinculaveisAction(cliente.id) : []);
  }

  function adicionar(escolhido: ProdutoEscolhido) {
    const proximas = [
      ...linhas,
      {
        produtoId: escolhido.produtoId,
        produtoCodigo: escolhido.codigo,
        produtoDescricao: escolhido.descricao,
        descricaoManual: escolhido.descricaoManual,
        quantidade: 1,
      },
    ];
    setLinhas(proximas);
    sincronizar(proximas);
  }

  function remover(indice: number) {
    const proximas = linhas.filter((_, i) => i !== indice);
    setLinhas(proximas);
    sincronizar(proximas);
  }

  function alterarQuantidade(indice: number, quantidade: number) {
    const proximas = linhas.map((l, i) =>
      i === indice ? { ...l, quantidade } : l,
    );
    setLinhas(proximas);
    sincronizar(proximas);
  }

  /**
   * Espelha a grade no formulário. O RHF é a fonte que o Zod valida — a grade é
   * só a apresentação. Duas fontes seriam o caminho para um item que aparece na
   * tela e não é enviado.
   */
  function sincronizar(proximas: LinhaNova[]) {
    form.setValue(
      "itens",
      proximas.map((l) => ({
        id: null,
        produtoId: l.produtoId,
        descricaoManual: l.descricaoManual,
        quantidade: l.quantidade,
        diagnosticoItem: "",
        solucaoItem: "",
      })),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  async function onSubmit(values: NovaOSValues) {
    setSaving(true);
    const result = await criarOrdemServicoAction(values);

    if (result.success) {
      form.reset(values); // limpa o "dirty" antes de navegar (evita o guard)
      toast.success(`Ordem de serviço ${result.data.numero} criada.`);
      router.push(`/pos-venda/ordens-de-servico/${result.data.id}`);
    } else {
      setSaving(false);
      toast.error(result.error);
    }
  }

  const erroItens = form.formState.errors.itens?.message;

  return (
    <FormProvider {...form}>
      <CrudFormShell
        title="Nova ordem de serviço"
        description="Análise, manutenção e reparo de produtos de pós-venda."
        form={form}
        onSubmit={onSubmit}
        onCancel={() => router.push("/pos-venda/ordens-de-servico")}
        submitting={saving}
      >
        <FormSection title="Dados da ordem de serviço">
          <ClienteAutocomplete
            value={clienteIdAtual || null}
            initialLabel={clienteLabel}
            onSelect={aoEscolherCliente}
            autoFocus
          />
          <TextField
            name="referencia"
            label="Referência"
            placeholder="Ex.: Fechadura entrada social, 7 interruptores sala/cozinha"
          />
          <UsuarioSelectField
            name="responsavelId"
            label="Responsável"
            options={responsaveis}
            placeholder="Selecione o responsável"
            opcional
          />
          <SelectField name="status" label="Status" options={STATUS_OPTIONS} />
        </FormSection>

        {/* Só aparece depois do cliente, e só quando ELE tem troca disponível:
            uma tela que sempre exibisse o campo sugeriria que a OS depende de
            uma troca — e não depende. */}
        {clienteIdAtual && trocas.length > 0 && (
          <FormSection title="Origem (opcional)" cols={1}>
            <div className="space-y-2">
              <Label htmlFor="os-troca">Troca antecipada relacionada</Label>
              <Select
                value={trocaAtual ?? SEM_TROCA}
                onValueChange={(v) =>
                  form.setValue(
                    "trocaAntecipadaId",
                    v === SEM_TROCA ? null : v,
                    { shouldDirty: true },
                  )
                }
              >
                <SelectTrigger
                  id="os-troca"
                  aria-label="Troca antecipada relacionada"
                >
                  <SelectValue placeholder="Nenhuma (ordem direta)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_TROCA}>
                    Nenhuma (ordem direta)
                  </SelectItem>
                  {trocas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label} — {t.sublabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Apenas trocas deste cliente que ainda não têm ordem de serviço.
              </p>
            </div>
          </FormSection>
        )}

        <FormSection title="Relato inicial" cols={1}>
          <TextareaField
            name="relatoInicial"
            label="O que foi relatado"
            rows={4}
            placeholder="Ex.: fechadura devolvida pelo cliente; trava de forma intermitente."
          />
        </FormSection>

        <FormSection title="Produtos" cols={1}>
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Adicionar produto
              </Button>
            </div>

            {linhas.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-md border border-dashed p-6 text-center">
                <Package className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Adicione ao menos um produto para analisar.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {linhas.map((linha, indice) => (
                  <li
                    key={indice}
                    data-testid="linha-item"
                    className="flex flex-wrap items-end justify-between gap-3 rounded-md border p-3"
                  >
                    <span className="min-w-0 break-words text-sm">
                      {descricaoDoItem({
                        produtoCodigo: linha.produtoCodigo,
                        produtoDescricao: linha.produtoDescricao,
                        descricaoManual: linha.descricaoManual,
                      })}
                    </span>
                    <div className="flex items-end gap-2">
                      <div className="space-y-1.5">
                        <Label htmlFor={`nova-os-qtd-${indice}`}>
                          Quantidade
                        </Label>
                        <Input
                          id={`nova-os-qtd-${indice}`}
                          aria-label={`Quantidade ${indice + 1}`}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          step={1}
                          className="w-28 tabular-nums"
                          value={linha.quantidade}
                          onChange={(e) => {
                            const n = Number(e.target.value);
                            alterarQuantidade(
                              indice,
                              Number.isFinite(n) ? n : 1,
                            );
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover produto ${indice + 1}`}
                        className="text-destructive hover:text-destructive"
                        onClick={() => remover(indice)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {erroItens && (
              <p className="text-sm text-destructive">{erroItens}</p>
            )}
          </div>
        </FormSection>
      </CrudFormShell>

      <AdicionarProdutoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={adicionar}
      />
    </FormProvider>
  );
}
