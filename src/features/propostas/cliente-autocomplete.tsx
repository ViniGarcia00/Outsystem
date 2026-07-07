"use client";

import { useEffect, useRef, useState } from "react";
import type { ControllerRenderProps } from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
// Type-only: NÃO importar valores do service (server) neste client component —
// isso arrastaria o Prisma para o bundle do cliente. A busca vai pela action.
import type { ClienteSuggestion } from "@/services/cliente.service";

import { searchClientesAction } from "./actions";

const DEBOUNCE_MS = 250;
/** Espelha CLIENTE_SEARCH_MIN_CHARS do service (server) — mantido em 3. */
const CLIENTE_SEARCH_MIN_CHARS = 3;

interface ClienteAutocompleteFieldProps {
  name: string;
  label: string;
  /** Rótulo do cliente já selecionado (preenche o campo no modo edição). */
  initialLabel?: string;
  placeholder?: string;
}

/**
 * Campo de busca (autocomplete) de Cliente ligado ao React Hook Form.
 *
 * Pesquisa por Nome, Razão Social, CPF ou CNPJ a partir de
 * {@link CLIENTE_SEARCH_MIN_CHARS} caracteres; o valor do formulário é o `id` do
 * cliente selecionado. Não há Select tradicional — a lista é carregada sob
 * demanda pelo servidor.
 */
export function ClienteAutocompleteField({
  name,
  label,
  initialLabel,
  placeholder = "Digite nome, razão social, CPF ou CNPJ...",
}: ClienteAutocompleteFieldProps) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <ClienteAutocomplete
            field={field}
            initialLabel={initialLabel}
            placeholder={placeholder}
          />
          <FormDescription>
            A pesquisa inicia após {CLIENTE_SEARCH_MIN_CHARS} caracteres.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function ClienteAutocomplete({
  field,
  initialLabel,
  placeholder,
}: {
  field: ControllerRenderProps;
  initialLabel?: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(initialLabel ?? "");
  const [results, setResults] = useState<ClienteSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const latestQuery = useRef(query);
  // Evita buscar automaticamente com o rótulo inicial (modo edição): só pesquisa
  // depois que o usuário digita algo.
  const touched = useRef(false);

  // Fecha a lista ao clicar fora do campo.
  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Busca com debounce; ignora respostas fora de ordem (compara com a query atual).
  useEffect(() => {
    const q = query.trim();
    latestQuery.current = q;
    if (!touched.current || q.length < CLIENTE_SEARCH_MIN_CHARS) return;

    let active = true;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchClientesAction(q);
        if (!active || latestQuery.current !== q) return; // resposta obsoleta
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
    field.onChange(sugestao.id);
    setQuery(sugestao.label);
    setResults([]);
    setOpen(false);
  }

  function aoDigitar(valor: string) {
    touched.current = true;
    setQuery(valor);
    // Alterar o texto invalida a seleção anterior (evita id/label divergentes).
    if (field.value) field.onChange("");
    if (valor.trim().length >= CLIENTE_SEARCH_MIN_CHARS) {
      setOpen(true);
    } else {
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
    <div ref={boxRef} className="relative">
      <FormControl>
        <Input
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          onChange={(event) => aoDigitar(event.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onKeyDown={aoTeclar}
        />
      </FormControl>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          {loading ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Buscando...</p>
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
                    // onMouseDown (não onClick) para selecionar antes do blur do input.
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
  );
}
