"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Provedor de tema (claro/escuro/sistema) baseado em `next-themes`.
 * A alternância adiciona/remove a classe `dark` no elemento <html>,
 * que os tokens do Tailwind v4 (globals.css) consomem.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
