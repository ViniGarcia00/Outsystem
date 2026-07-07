import {
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  Users,
  UserSquare,
} from "lucide-react";

import type { NavItem } from "@/types";

/**
 * Fonte única da navegação principal. O Dashboard é placeholder; a home da
 * aplicação (`/`) abre Propostas enquanto o Dashboard não é implementado.
 */
export const mainNavigation: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Propostas", href: "/propostas", icon: FileText },
  { title: "Clientes", href: "/clientes", icon: Users },
  { title: "Produtos", href: "/produtos", icon: Package },
  { title: "Vendedores", href: "/vendedores", icon: UserSquare },
  { title: "Configurações", href: "/configuracoes", icon: Settings },
];
