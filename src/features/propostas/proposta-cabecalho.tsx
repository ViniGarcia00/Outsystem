"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ModeloProposta } from "@/services/proposta.service";
import type { WorkspaceDTO } from "@/services/proposta-conteudo.service";

import { salvarCabecalhoAction } from "./actions";
import { ClienteAutocomplete } from "./cliente-autocomplete";
import { MODELO_OPTIONS } from "./labels";
import type { CabecalhoPatchValues } from "./schema";

interface Option {
  value: string;
  label: string;
}

/** Sentinela para "sem vendedor" (o Select do shadcn não aceita value vazio). */
const VENDEDOR_NENHUM = "__none__";

/**
 * Cabeçalho editável do workspace. Cada campo auto-salva no seu evento de
 * commit (change para selects/autocomplete, blur para textos). Não há "Salvar".
 */
export function PropostaCabecalho({
  data,
  vendedores,
  readOnly,
  onSaved,
}: {
  data: WorkspaceDTO;
  vendedores: Option[];
  readOnly: boolean;
  onSaved: () => void;
}) {
  const [modelo, setModelo] = useState<ModeloProposta>(data.modelo);
  const [vendedorId, setVendedorId] = useState(data.vendedorId ?? "");

  const salvar = async (patch: CabecalhoPatchValues) => {
    const result = await salvarCabecalhoAction(data.id, patch);
    if (result.success) onSaved();
    else toast.error(result.error);
  };

  return (
    <div className="space-y-4">
      {/* Modelo — primeiro campo, linha inteira */}
      <div className="space-y-2">
        <Label htmlFor="cab-modelo">Modelo da proposta</Label>
        <Select
          value={modelo}
          disabled={readOnly}
          onValueChange={(v) => {
            const m = v as ModeloProposta;
            setModelo(m);
            salvar({ modelo: m });
          }}
        >
          <SelectTrigger id="cab-modelo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODELO_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ClienteAutocomplete
          value={data.clienteId}
          initialLabel={data.clienteNome}
          autoFocus={!data.clienteId}
          disabled={readOnly}
          onSelect={(c) => salvar({ clienteId: c?.id ?? null })}
        />

        <div className="space-y-2">
          <Label htmlFor="cab-vendedor">Vendedor</Label>
          <Select
            value={vendedorId || VENDEDOR_NENHUM}
            disabled={readOnly}
            onValueChange={(v) => {
              const val = v === VENDEDOR_NENHUM ? "" : v;
              setVendedorId(val);
              salvar({ vendedorId: val || null });
            }}
          >
            <SelectTrigger id="cab-vendedor">
              <SelectValue placeholder="Opcional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={VENDEDOR_NENHUM}>Nenhum</SelectItem>
              {vendedores.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cab-validade">Validade (dias)</Label>
          <Input
            id="cab-validade"
            type="number"
            min={1}
            defaultValue={data.validadeDias}
            disabled={readOnly}
            onBlur={(e) => {
              const n = Number(e.target.value);
              if (
                Number.isInteger(n) &&
                n >= 1 &&
                n <= 3650 &&
                n !== data.validadeDias
              ) {
                salvar({ validadeDias: n });
              }
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cab-obs-internas">Observações internas</Label>
          <Textarea
            id="cab-obs-internas"
            rows={3}
            defaultValue={data.obsInternas}
            disabled={readOnly}
            onBlur={(e) => {
              const v = e.target.value;
              if (v !== data.obsInternas) salvar({ obsInternas: v || null });
            }}
          />
          <p className="text-xs text-muted-foreground">
            Uso interno — nunca aparece no PDF nem para o cliente.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cab-obs-proposta">Observações da proposta</Label>
          <Textarea
            id="cab-obs-proposta"
            rows={3}
            defaultValue={data.obsProposta}
            disabled={readOnly}
            onBlur={(e) => {
              const v = e.target.value;
              if (v !== data.obsProposta) salvar({ obsProposta: v || null });
            }}
          />
          <p className="text-xs text-muted-foreground">
            Poderá aparecer no PDF futuramente.
          </p>
        </div>
      </div>
    </div>
  );
}
