import {
  FileText,
  LayoutDashboard,
  LifeBuoy,
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
 * `Pós-venda` (Sprint 4.6) entra DEPOIS de Instalações e antes de Usuários: é
 * operacional como Instalações, e vem em seguida porque é o que acontece
 * *depois* da instalação. O item aponta para o hub `/pos-venda`, que oferece
 * Trocas Antecipadas e Ordens de Serviço — os submódulos não têm item próprio
 * no menu, para não inflar a barra lateral com um nível que o hub já resolve.
 * `LifeBuoy` (suporte) distingue de `Wrench`, que é Instalações.
 *
 * A home da aplicação (`/`) continua abrindo Propostas.
 */
export const mainNavigation: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", href: "/clientes", icon: Users },
  { title: "Produtos", href: "/produtos", icon: Package },
  { title: "Propostas", href: "/propostas", icon: FileText },
  { title: "Instalações", href: "/instalacoes", icon: Wrench },
  { title: "Pós-venda", href: "/pos-venda", icon: LifeBuoy },
  { title: "Usuários", href: "/usuarios", icon: UserCog },
  { title: "Configurações", href: "/configuracoes", icon: Settings },
];
