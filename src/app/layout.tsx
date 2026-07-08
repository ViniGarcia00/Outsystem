import type { Metadata } from "next";

import { AppShell, ThemeProvider } from "@/components/layout";
import { NavigationBlockerProvider } from "@/components/shared";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Outmat Propostas",
    template: "%s | Outmat Propostas",
  },
  description: "Sistema interno de geração de propostas — Outmat.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="h-full antialiased">
      {/* suppressHydrationWarning: extensões do navegador injetam classes no
          <body> (ex.: `vsc-initialized`) antes da hidratação — aviso benigno. */}
      <body suppressHydrationWarning className="min-h-svh">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={200}>
            <NavigationBlockerProvider>
              <AppShell>{children}</AppShell>
            </NavigationBlockerProvider>
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
