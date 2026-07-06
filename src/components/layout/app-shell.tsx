"use client";

import * as React from "react";

import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks";

import { Header } from "./header";
import { DesktopSidebar, SidebarContent } from "./sidebar";

const COLLAPSED_STORAGE_KEY = "outmat.sidebar.collapsed";

/**
 * Casca da aplicação: compõe a Sidebar (recolhível no desktop, off-canvas no
 * mobile), o Header e a área principal de conteúdo. Estrutura visual apenas —
 * sem funcionalidades de negócio.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Restaura a preferência persistida após a hidratação. O estado inicial é
  // sempre `false` (igual no servidor e no cliente) para evitar mismatch de
  // hidratação; a sincronização com o localStorage é um efeito colateral
  // intencional com sistema externo, executado uma única vez.
  React.useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
    if (stored !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync único com localStorage (sistema externo)
      setCollapsed(stored === "true");
    }
  }, []);

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setMobileOpen((open) => !open);
      return;
    }
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      return next;
    });
  }, [isMobile]);

  return (
    <div className="flex min-h-svh w-full">
      <DesktopSidebar collapsed={collapsed} />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
