"use client";

import { PanelLeft } from "lucide-react";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { BreadcrumbNav } from "./breadcrumb-nav";

/**
 * Área direita do header. Espaço PREPARADO (layout) para exibir futuramente:
 * - Nome da empresa (a partir das Configurações)
 * - Data/Hora
 * Ainda NÃO implementado — apenas a estrutura/slots reservados.
 */
function HeaderMeta() {
  return (
    <div className="hidden items-center gap-3 sm:flex">
      {/* TODO(configuracoes): nome da empresa */}
      {/* TODO: data/hora */}
      <div
        data-slot="header-company"
        aria-hidden
        className="flex flex-col items-end leading-tight"
      />
      <div data-slot="header-datetime" aria-hidden />
    </div>
  );
}

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        aria-label="Alternar menu lateral"
      >
        <PanelLeft className="h-5 w-5" />
      </Button>

      <BreadcrumbNav />

      <div className="ml-auto flex items-center gap-3">
        <HeaderMeta />
        <Separator
          orientation="vertical"
          className="hidden !h-6 sm:block"
        />
        <ThemeToggle />
      </div>
    </header>
  );
}
