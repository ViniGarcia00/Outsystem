"use client";

import type { FormEventHandler, ReactNode } from "react";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PageFormProps {
  onSubmit?: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  /** Rodapé de ações (ex.: `<PageActions onSave onCancel />`). */
  footer?: ReactNode;
  className?: string;
}

/**
 * Moldura padrão de formulário: superfície de card única, espaçamento vertical
 * consistente entre campos e rodapé de ações. Apenas estrutura — a validação
 * (React Hook Form + Zod) fica a cargo de cada tela.
 */
export function PageForm({
  onSubmit,
  children,
  footer,
  className,
}: PageFormProps) {
  return (
    <form onSubmit={onSubmit} className={cn("w-full", className)}>
      <Card>
        <CardContent className="flex flex-col gap-5">{children}</CardContent>
        {footer && (
          <CardFooter className="justify-end gap-2">{footer}</CardFooter>
        )}
      </Card>
    </form>
  );
}
