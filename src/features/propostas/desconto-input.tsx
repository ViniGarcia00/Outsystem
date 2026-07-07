"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/utils";

import type { Desconto } from "./totais";

/** Número no formato BR: "7,5" → 7.5; "1.234,56" → 1234.56; "500" → 500. */
function parseNumeroBR(texto: string): number {
  const t = texto.replace(/%/g, "").replace(/\s/g, "").trim();
  if (!t) return NaN;
  if (t.includes(",")) return Number(t.replace(/\./g, "").replace(",", "."));
  return Number(t);
}

/** Interpreta o texto: com "%" → PERCENTUAL (0–100); senão → VALOR (≥ 0). */
function parseDesconto(texto: string): Desconto {
  const n = parseNumeroBR(texto);
  const valor = Number.isFinite(n) ? n : 0;
  if (texto.includes("%")) {
    return { tipo: "PERCENTUAL", valor: Math.min(Math.max(valor, 0), 100) };
  }
  return { tipo: "VALOR", valor: Math.max(valor, 0) };
}

const numeroBR = (v: number, agrupar = false) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: 2, useGrouping: agrupar });

/** Exibição ao sair do foco: "R$ 500,00" ou "10%" (vazio quando não há desconto). */
export function formatDesconto(d: Desconto): string {
  if (!d.valor) return "";
  return d.tipo === "PERCENTUAL"
    ? `${numeroBR(d.valor)}%`
    : formatCurrency(d.valor);
}

/** Representação editável ao focar: "500" ou "10%". */
function toEditable(d: Desconto): string {
  if (!d.valor) return "";
  return d.tipo === "PERCENTUAL" ? `${numeroBR(d.valor)}%` : numeroBR(d.valor);
}

/**
 * Campo único e inteligente de desconto. Digitar "500" ⇒ desconto em VALOR
 * (R$ 500,00); acrescentar "%" ⇒ PERCENTUAL (10%). Sem botão/seletor. Ao sair do
 * foco, formata a exibição. O valor sai como `Desconto` ({ tipo, valor }) —
 * armazenamento separado, nunca string. ADR-0220.
 */
export function DescontoInput({
  value,
  onChange,
  disabled = false,
  id,
}: {
  value: Desconto;
  onChange: (desconto: Desconto) => void;
  disabled?: boolean;
  id?: string;
}) {
  const [focado, setFocado] = useState(false);
  const [texto, setTexto] = useState("");

  return (
    <Input
      id={id}
      inputMode="decimal"
      autoComplete="off"
      placeholder="Ex.: 500 ou 10%"
      disabled={disabled}
      aria-label="Desconto"
      value={focado ? texto : formatDesconto(value)}
      onFocus={() => {
        setTexto(toEditable(value));
        setFocado(true);
      }}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => {
        setFocado(false);
        const novo = parseDesconto(texto);
        if (novo.tipo !== value.tipo || novo.valor !== value.valor) {
          onChange(novo);
        }
      }}
      className="h-8 w-32 text-right"
    />
  );
}
