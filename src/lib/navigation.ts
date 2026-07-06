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
 * Fonte única da navegação principal.
 * Cada item aponta para uma feature. As telas são apenas placeholders
 * nesta Sprint (sem funcionalidades).
 */
export const mainNavigation: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Propostas", href: "/propostas", icon: FileText },
  { title: "Clientes", href: "/clientes", icon: Users },
  { title: "Produtos", href: "/produtos", icon: Package },
  { title: "Vendedores", href: "/vendedores", icon: UserSquare },
  { title: "Configurações", href: "/configuracoes", icon: Settings },
];
