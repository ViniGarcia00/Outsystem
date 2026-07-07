"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 250;

interface AutocompleteProps<T extends { id: string }> {
  /** id do item selecionado (ou null). */
  value: string | null;
  /** Rótulo do item já selecionado (exibido ao abrir em modo edição). */
  initialLabel?: string | null;
  /** Busca sob demanda (Server Action). */
  search: (query: string) => Promise<T[]>;
  /** Texto principal do item (usado no input após a seleção). */
  getLabel: (item: T) => string;
  /** Texto secundário (documento, unidade/valor…). */
  getSublabel?: (item: T) => string | undefined;
  onSelect: (item: T | null) => void;
  label?: string;
  placeholder?: string;
  minChars?: number;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * Autocomplete genérico e reutilizável — busca sob demanda, debounce, teclado
 * (↑/↓/Enter/Esc) e clique. Usado por Cliente e Produto (e futuros). Standalone,
 * sem React Hook Form.
 */
export function Autocomplete<T extends { id: string }>({
  value,
  initialLabel,
  search,
  getLabel,
  getSublabel,
  onSelect,
  label,
  placeholder = "Digite para pesquisar...",
  minChars = 3,
  autoFocus = false,
  disabled = false,
}: AutocompleteProps<T>) {
  const inputId = useId();
  const [query, setQuery] = useState(initialLabel ?? "");
  const [results, setResults] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const latestQuery = useRef(query);
  const touched = useRef(false);

  // Sincroniza o texto quando o rótulo inicial muda (ex.: refresh), desde que o
  // usuário não esteja digitando.
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
    if (!touched.current || q.length < minChars) return;

    let active = true;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await search(q);
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
  }, [query, minChars, search]);

  function selecionar(item: T) {
    setQuery(getLabel(item));
    setResults([]);
    setOpen(false);
    touched.current = false;
    onSelect(item);
  }

  function aoDigitar(valor: string) {
    touched.current = true;
    setQuery(valor);
    // Alterar o texto invalida a seleção anterior (evita id/label divergentes).
    if (value) onSelect(null);
    if (valor.trim().length >= minChars) setOpen(true);
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

  const abaixoDoMinimo = query.trim().length < minChars;

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={inputId}>{label}</Label>}
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
                Digite ao menos {minChars} caracteres.
              </p>
            ) : results.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                Nenhum resultado encontrado.
              </p>
            ) : (
              <ul role="listbox" className="max-h-60 overflow-auto py-1">
                {results.map((item, index) => {
                  const sub = getSublabel?.(item);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={index === highlight}
                        // onMouseDown (não onClick) para selecionar antes do blur.
                        onMouseDown={(event) => {
                          event.preventDefault();
                          selecionar(item);
                        }}
                        onMouseEnter={() => setHighlight(index)}
                        className={cn(
                          "flex w-full flex-col items-start px-3 py-1.5 text-left text-sm",
                          index === highlight &&
                            "bg-accent text-accent-foreground",
                        )}
                      >
                        <span className="font-medium">{getLabel(item)}</span>
                        {sub && (
                          <span className="text-xs text-muted-foreground">
                            {sub}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
