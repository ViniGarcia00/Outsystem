"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
// Type-only: NÃO importar valores do service (server) neste client component —
// isso arrastaria o Prisma para o bundle do cliente. A busca vai pela action.
import type { ClienteSuggestion } from "@/services/cliente.service";

import { searchClientesAction } from "./actions";

const DEBOUNCE_MS = 250;
/** Espelha CLIENTE_SEARCH_MIN_CHARS do service (server) — mantido em 3. */
const CLIENTE_SEARCH_MIN_CHARS = 3;

interface ClienteAutocompleteProps {
  /** id do cliente selecionado (ou null). */
  value: string | null;
  /** Rótulo do cliente já selecionado (exibido ao abrir em modo edição). */
  initialLabel?: string | null;
  /** Chamado ao selecionar (ou limpar) um cliente. */
  onSelect: (cliente: { id: string; label: string } | null) => void;
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * Busca (autocomplete) de Cliente — standalone, sem React Hook Form.
 * Pesquisa por Nome/Razão Social/CPF/CNPJ a partir de 3 caracteres; a lista é
 * carregada sob demanda pelo servidor (Server Action).
 */
export function ClienteAutocomplete({
  value,
  initialLabel,
  onSelect,
  label = "Cliente",
  placeholder = "Digite nome, razão social, CPF ou CNPJ...",
  autoFocus = false,
  disabled = false,
}: ClienteAutocompleteProps) {
  const inputId = useId();
  const [query, setQuery] = useState(initialLabel ?? "");
  const [results, setResults] = useState<ClienteSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const latestQuery = useRef(query);
  const touched = useRef(false);

  // Sincroniza o texto quando o rótulo inicial muda (ex.: refresh do workspace),
  // desde que o usuário não esteja digitando.
  useEffect(() => {
    if (!touched.current) setQuery(initialLabel ?? "");
  }, [initialLabel]);

  // Fecha a lista ao clicar fora.
  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Busca com debounce; ignora respostas fora de ordem.
  useEffect(() => {
    const q = query.trim();
    latestQuery.current = q;
    if (!touched.current || q.length < CLIENTE_SEARCH_MIN_CHARS) return;

    let active = true;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchClientesAction(q);
        if (!active || latestQuery.current !== q) return;
        setResults(res);
        setHighlight(0);
        setOpen(true);
      } finally {
        if (active && latestQuery.current === q) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [query]);

  function selecionar(sugestao: ClienteSuggestion) {
    setQuery(sugestao.label);
    setResults([]);
    setOpen(false);
    touched.current = false;
    onSelect({ id: sugestao.id, label: sugestao.label });
  }

  function aoDigitar(valor: string) {
    touched.current = true;
    setQuery(valor);
    // Alterar o texto invalida a seleção anterior (evita id/label divergentes).
    if (value) onSelect(null);
    if (valor.trim().length >= CLIENTE_SEARCH_MIN_CHARS) setOpen(true);
    else {
      setResults([]);
      setOpen(false);
    }
  }

  function aoTeclar(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      selecionar(results[highlight]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const abaixoDoMinimo = query.trim().length < CLIENTE_SEARCH_MIN_CHARS;

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div ref={boxRef} className="relative">
        <Input
          id={inputId}
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          autoFocus={autoFocus}
          disabled={disabled}
          onChange={(event) => aoDigitar(event.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onKeyDown={aoTeclar}
        />

        {open && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
            {loading ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                Buscando...
              </p>
            ) : abaixoDoMinimo ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                Digite ao menos {CLIENTE_SEARCH_MIN_CHARS} caracteres.
              </p>
            ) : results.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                Nenhum cliente encontrado.
              </p>
            ) : (
              <ul role="listbox" className="max-h-60 overflow-auto py-1">
                {results.map((sugestao, index) => (
                  <li key={sugestao.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === highlight}
                      // onMouseDown (não onClick) para selecionar antes do blur.
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selecionar(sugestao);
                      }}
                      onMouseEnter={() => setHighlight(index)}
                      className={cn(
                        "flex w-full flex-col items-start px-3 py-1.5 text-left text-sm",
                        index === highlight && "bg-accent text-accent-foreground",
                      )}
                    >
                      <span className="font-medium">{sugestao.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {sugestao.sublabel}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
