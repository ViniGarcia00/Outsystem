import {
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";

import type { NavItem } from "@/types";

/**
 * Fonte única da navegação principal.
 *
 * A ordem é deliberada (Sprint 4.0.3, revista na 4.2) e travada por teste: o
 * Dashboard abre, depois vêm os cadastros que alimentam uma proposta (Cliente e
 * Produto), então o fluxo comercial (Propostas) e o operacional (Instalações),
 * depois o cadastro das pessoas que aparecem nos dois (Usuários) e por fim
 * Configurações.
 *
 * `Usuários` substitui `Vendedores` e `Técnicos`, que eram a mesma pessoa em
 * dois cadastros (ADR-0410). Não há redirect das rotas antigas: aplicação
 * interna, sem SEO nem link externo — manter os dois nomes vivos contrariaria
 * o objetivo da Sprint. `UserCog` distingue de `Users`, que é Clientes.
 *
 * A home da aplicação (`/`) continua abrindo Propostas.
 */
export const mainNavigation: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", href: "/clientes", icon: Users },
  { title: "Produtos", href: "/produtos", icon: Package },
  { title: "Propostas", href: "/propostas", icon: FileText },
  { title: "Instalações", href: "/instalacoes", icon: Wrench },
  { title: "Usuários", href: "/usuarios", icon: UserCog },
  { title: "Configurações", href: "/configuracoes", icon: Settings },
];
