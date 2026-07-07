import { FileText, Package, Settings, Users, UserSquare } from "lucide-react";

import type { NavItem } from "@/types";

/**
 * Fonte única da navegação principal.
 * Propostas é a home da aplicação enquanto não houver Dashboard.
 */
export const mainNavigation: NavItem[] = [
  { title: "Propostas", href: "/propostas", icon: FileText },
  { title: "Clientes", href: "/clientes", icon: Users },
  { title: "Produtos", href: "/produtos", icon: Package },
  { title: "Vendedores", href: "/vendedores", icon: UserSquare },
  { title: "Configurações", href: "/configuracoes", icon: Settings },
];
