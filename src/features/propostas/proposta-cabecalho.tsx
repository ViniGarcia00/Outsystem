"use client";

import { useRef, useState } from "react";

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

import { ClienteAutocomplete } from "./cliente-autocomplete";
import { MODELO_OPTIONS } from "./labels";
import type { CabecalhoPatchValues } from "./schema";

interface Option {
  value: string;
  label: string;
}

/** Valores iniciais do cabeçalho (persistido ou em memória). */
export interface CabecalhoValores {
  clienteId: string | null;
  clienteNome: string | null;
  vendedorId: string | null;
  modelo: ModeloProposta;
  validadeDias: number;
  obsInternas: string;
  obsProposta: string;
}

/** Sentinela para "sem vendedor" (o Select do shadcn não aceita value vazio). */
const VENDEDOR_NENHUM = "__none__";

/**
 * Cabeçalho editável, self-contained. Cada campo comita no seu evento (change
 * para selects/autocomplete, blur para textos) chamando `onCampo` — que persiste
 * (workspace definitivo) ou atualiza o estado em memória (criação). Não há botão
 * "Salvar".
 */
export function PropostaCabecalho({
  valores,
  vendedores,
  readOnly,
  onCampo,
}: {
  valores: CabecalhoValores;
  vendedores: Option[];
  readOnly: boolean;
  onCampo: (patch: CabecalhoPatchValues) => void | Promise<void>;
}) {
  const [modelo, setModelo] = useState<ModeloProposta>(valores.modelo);
  const [vendedorId, setVendedorId] = useState(valores.vendedorId ?? "");
  const [clienteId, setClienteId] = useState(valores.clienteId);
  const [clienteLabel, setClienteLabel] = useState(valores.clienteNome ?? "");

  // Últimos valores comitados dos campos de texto (evita salvar sem mudança).
  const ultimaValidade = useRef(String(valores.validadeDias));
  const ultimaObsInternas = useRef(valores.obsInternas);
  const ultimaObsProposta = useRef(valores.obsProposta);

  return (
    <div className="space-y-4">
      {/* Modelo — meia largura (o restante fica reservado para campos futuros). */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cab-modelo">Modelo da proposta</Label>
          <Select
            value={modelo}
            disabled={readOnly}
            onValueChange={(v) => {
              const m = v as ModeloProposta;
              setModelo(m);
              onCampo({ modelo: m });
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ClienteAutocomplete
          value={clienteId}
          initialLabel={clienteLabel}
          autoFocus={!clienteId}
          disabled={readOnly}
          onSelect={(c) => {
            setClienteId(c?.id ?? null);
            setClienteLabel(c?.label ?? "");
            onCampo({ clienteId: c?.id ?? null });
          }}
        />

        <div className="space-y-2">
          <Label htmlFor="cab-vendedor">Vendedor</Label>
          <Select
            value={vendedorId || VENDEDOR_NENHUM}
            disabled={readOnly}
            onValueChange={(v) => {
              const val = v === VENDEDOR_NENHUM ? "" : v;
              setVendedorId(val);
              onCampo({ vendedorId: val || null });
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
            defaultValue={valores.validadeDias}
            disabled={readOnly}
            onBlur={(e) => {
              const v = e.target.value;
              const n = Number(v);
              if (
                Number.isInteger(n) &&
                n >= 1 &&
                n <= 3650 &&
                v !== ultimaValidade.current
              ) {
                ultimaValidade.current = v;
                onCampo({ validadeDias: n });
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
            defaultValue={valores.obsInternas}
            disabled={readOnly}
            onBlur={(e) => {
              const v = e.target.value;
              if (v !== ultimaObsInternas.current) {
                ultimaObsInternas.current = v;
                onCampo({ obsInternas: v || null });
              }
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
            defaultValue={valores.obsProposta}
            disabled={readOnly}
            onBlur={(e) => {
              const v = e.target.value;
              if (v !== ultimaObsProposta.current) {
                ultimaObsProposta.current = v;
                onCampo({ obsProposta: v || null });
              }
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
