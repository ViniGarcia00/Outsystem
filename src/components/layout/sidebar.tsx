"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

import { SidebarNav } from "./sidebar-nav";

function SidebarBrand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
        OP
      </div>
      {!collapsed && (
        <span className="truncate text-sm font-semibold text-sidebar-foreground">
          Outmat Propostas
        </span>
      )}
    </Link>
  );
}

interface SidebarContentProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

/** Conteúdo da sidebar reutilizado no desktop (aside) e no mobile (sheet). */
export function SidebarContent({ collapsed, onNavigate }: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <SidebarBrand collapsed={collapsed} />
      <div className="flex-1 overflow-y-auto py-3">
        <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

/** Sidebar fixa do desktop, com largura animada conforme o estado recolhido. */
export function DesktopSidebar({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "hidden shrink-0 border-r border-sidebar-border transition-[width] duration-200 md:block",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="sticky top-0 h-svh">
        <SidebarContent collapsed={collapsed} />
      </div>
    </aside>
  );
}
