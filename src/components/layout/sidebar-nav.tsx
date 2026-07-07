"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  confirmDiscardChanges,
  useNavigationBlocker,
} from "@/components/shared";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { mainNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  /** Modo recolhido: mostra apenas ícones (com tooltip). */
  collapsed?: boolean;
  /** Callback ao navegar (usado para fechar o menu mobile). */
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const { isBlocked } = useNavigationBlocker();

  return (
    <nav className="flex flex-col gap-1 px-2" aria-label="Navegação principal">
      {mainNavigation.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        const link = (
          <Link
            href={item.href}
            onClick={onNavigate}
            onNavigate={(event) => {
              // Bloqueia a saída quando há alterações não salvas no formulário.
              if (isBlocked && !confirmDiscardChanges()) {
                event.preventDefault();
              }
            }}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-2",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.title}</span>}
          </Link>
        );

        if (!collapsed) {
          return <div key={item.href}>{link}</div>;
        }

        return (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{item.title}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}
