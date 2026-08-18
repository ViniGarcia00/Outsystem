/**
 * Endereço da Instalação (Sprint 4.0.1).
 *
 * O endereço é SNAPSHOT do Cliente no momento da criação: alterar o cadastro do
 * Cliente depois NÃO pode mudar o endereço de instalações antigas (ADR-0400).
 * Por isso os campos são copiados, e não lidos por join na exibição.
 *
 * A garantia é do service — `criarInstalacao` lê o Cliente persistido e chama
 * `snapshotEndereco` por conta própria. Nada de endereço vindo do navegador é
 * gravado.
 *
 * Os nomes mudam na cópia: `endereco`/`numero` do Cliente viram
 * `enderecoLogradouro`/`enderecoNumero` na Instalação, porque `numero` já é a
 * numeração comercial da instalação e a ambiguidade seria perigosa.
 *
 * Módulo PURO — testado sem banco.
 */

export interface EnderecoCliente {
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
}

export interface EnderecoInstalacao {
  cep: string | null;
  enderecoLogradouro: string | null;
  enderecoNumero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
}

/** Texto útil ou null — vazio e espaços em branco viram null. */
const nn = (v?: string | null): string | null => {
  const t = v?.trim();
  return t ? t : null;
};

export function snapshotEndereco(cliente: EnderecoCliente): EnderecoInstalacao {
  return {
    cep: nn(cliente.cep),
    enderecoLogradouro: nn(cliente.endereco),
    enderecoNumero: nn(cliente.numero),
    complemento: nn(cliente.complemento),
    bairro: nn(cliente.bairro),
    cidade: nn(cliente.cidade),
    estado: nn(cliente.estado),
  };
}

/**
 * Endereço em linha única para exibição. Mesmo separador (" · ") usado pelo
 * `montarEndereco` dos PDFs, para que as duas telas leiam igual.
 */
export function enderecoEmLinha(e: EnderecoInstalacao): string {
  const logradouro = [e.enderecoLogradouro, e.enderecoNumero]
    .filter(Boolean)
    .join(", ");
  const cidadeUf = [e.cidade, e.estado].filter(Boolean).join("/");
  const partes = [
    logradouro || null,
    e.complemento,
    e.bairro,
    cidadeUf || null,
    e.cep ? `CEP ${e.cep}` : null,
  ].filter(Boolean);
  return partes.length ? partes.join(" · ") : "—";
}
