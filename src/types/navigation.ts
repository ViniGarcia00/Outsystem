import type { LucideIcon } from "lucide-react";

/** Item de navegação exibido na Sidebar. */
export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

/** Segmento de trilha (breadcrumb). */
export interface BreadcrumbSegment {
  label: string;
  href?: string;
}
