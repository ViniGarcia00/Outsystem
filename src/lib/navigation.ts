import {
  FileText,
  HardHat,
  LayoutDashboard,
  Package,
  Settings,
  Users,
  UserSquare,
  Wrench,
} from "lucide-react";

import type { NavItem } from "@/types";

/**
 * Fonte única da navegação principal.
 *
 * A ordem é deliberada (Sprint 4.0.3) e travada por teste: o Dashboard abre,
 * depois vêm os cadastros que alimentam uma proposta (Cliente e Produto), então
 * o fluxo comercial (Propostas) e o operacional (Instalações), depois os
 * cadastros de pessoas que aparecem neles (Vendedores e Técnicos) e por fim
 * Configurações.
 *
 * A home da aplicação (`/`) continua abrindo Propostas.
 */
export const mainNavigation: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", href: "/clientes", icon: Users },
  { title: "Produtos", href: "/produtos", icon: Package },
  { title: "Propostas", href: "/propostas", icon: FileText },
  { title: "Instalações", href: "/instalacoes", icon: Wrench },
  { title: "Vendedores", href: "/vendedores", icon: UserSquare },
  { title: "Técnicos", href: "/tecnicos", icon: HardHat },
  { title: "Configurações", href: "/configuracoes", icon: Settings },
];
