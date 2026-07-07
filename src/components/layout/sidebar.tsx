"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

import { AppLogo } from "./app-logo";
import { SidebarNav } from "./sidebar-nav";

function SidebarBrand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      href="/propostas"
      className="flex h-16 items-center border-b border-sidebar-border px-3"
    >
      <AppLogo collapsed={collapsed} />
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
      data-slot="sidebar"
      data-collapsed={collapsed}
      aria-label="Barra lateral"
      className={cn(
        "hidden shrink-0 border-r border-sidebar-border transition-[width] duration-200 md:block",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <div className="sticky top-0 h-svh">
        <SidebarContent collapsed={collapsed} />
      </div>
    </aside>
  );
}
