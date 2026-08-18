"use client";

import { FormSection } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { enderecoEmLinha, type EnderecoInstalacao } from "./endereco";

const VAZIO: EnderecoInstalacao = {
  cep: null,
  enderecoLogradouro: null,
  enderecoNumero: null,
  complemento: null,
  bairro: null,
  cidade: null,
  estado: null,
};

const CAMPOS: { key: keyof EnderecoInstalacao; label: string }[] = [
  { key: "cep", label: "CEP" },
  { key: "enderecoLogradouro", label: "Logradouro" },
  { key: "enderecoNumero", label: "Número" },
  { key: "complemento", label: "Complemento" },
  { key: "bairro", label: "Bairro" },
  { key: "cidade", label: "Cidade" },
  { key: "estado", label: "UF" },
];

/**
 * Endereço da instalação — SOMENTE LEITURA (Sprint 4.0.1).
 *
 * O endereço é copiado do cadastro do Cliente no momento da criação e a partir
 * daí pertence à instalação (ADR-0400). Estes campos existem para conferência:
 * **nada aqui é enviado ao servidor**. O que é gravado vem de
 * `criarInstalacao`, que lê o Cliente persistido por conta própria.
 *
 * Não há endereço alternativo de obra nesta Sprint — para mudar o endereço,
 * corrige-se o cadastro do cliente antes de criar a instalação.
 */
export function EnderecoSnapshot({
  endereco,
  nota,
}: {
  endereco: EnderecoInstalacao | null;
  nota: string;
}) {
  const e = endereco ?? VAZIO;

  return (
    <FormSection title="Endereço da instalação">
      {CAMPOS.map(({ key, label }) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={`instalacao-${key}`}>{label}</Label>
          <Input
            id={`instalacao-${key}`}
            value={e[key] ?? ""}
            readOnly
            disabled
            aria-label={label}
          />
        </div>
      ))}
      <p className="text-xs text-muted-foreground sm:col-span-2">
        {enderecoEmLinha(e)}
      </p>
      <p className="text-xs text-muted-foreground sm:col-span-2">{nota}</p>
    </FormSection>
  );
}
