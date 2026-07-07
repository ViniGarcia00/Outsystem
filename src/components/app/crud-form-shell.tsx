"use client";

import { ArrowLeft, Save, X } from "lucide-react";
import type { ReactNode } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

import { FormDirtyGuard } from "@/components/shared/form-dirty-guard";
import { confirmDiscardChanges } from "@/components/shared/navigation-blocker";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useFormShortcuts } from "@/hooks/use-form-shortcuts";

import { AppPage } from "./app-page";
import { PageForm } from "./page-form";
import { PageHeader } from "./page-header";

interface CrudFormShellProps<TValues extends FieldValues> {
  title: string;
  description?: string;
  form: UseFormReturn<TValues>;
  onSubmit: (values: TValues) => Promise<void> | void;
  /** Navegação de cancelamento (ex.: voltar para a listagem). */
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
  /** Somente leitura: desabilita os campos e mostra apenas "Voltar". */
  readOnly?: boolean;
  /** Ações à direita do cabeçalho (ex.: badge de status). */
  headerActions?: ReactNode;
  children: ReactNode;
}

/**
 * Moldura ÚNICA de formulário de cadastro: PageHeader + formulário + botões
 * Salvar/Cancelar. Idêntica em Configuração, Clientes, Produtos e Vendedores.
 *
 * Já integra: React Hook Form, atalhos (CTRL+S / ESC), guarda de alterações
 * não salvas (FormDirtyGuard) e confirmação ao cancelar com dados sujos.
 */
export function CrudFormShell<TValues extends FieldValues>({
  title,
  description,
  form,
  onSubmit,
  onCancel,
  submitting = false,
  submitLabel = "Salvar",
  readOnly = false,
  headerActions,
  children,
}: CrudFormShellProps<TValues>) {
  const submit = form.handleSubmit(onSubmit);

  const handleCancel = () => {
    if (!readOnly && form.formState.isDirty && !confirmDiscardChanges()) return;
    onCancel();
  };

  useFormShortcuts({
    onSave: submit,
    onCancel: handleCancel,
    enabled: !submitting && !readOnly,
  });

  const footer = readOnly ? (
    <Button type="button" variant="outline" onClick={onCancel}>
      <ArrowLeft className="h-4 w-4" />
      Voltar
    </Button>
  ) : (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={handleCancel}
        disabled={submitting}
      >
        <X className="h-4 w-4" />
        Cancelar
      </Button>
      <Button type="submit" disabled={submitting}>
        <Save className="h-4 w-4" />
        {submitting ? "Salvando..." : submitLabel}
      </Button>
    </>
  );

  return (
    <Form {...form}>
      <FormDirtyGuard when={!readOnly && form.formState.isDirty && !submitting} />
      <AppPage>
        <PageHeader
          title={title}
          description={description}
          actions={headerActions}
        />
        <PageForm onSubmit={submit} footer={footer}>
          {readOnly ? (
            <fieldset disabled className="contents">
              {children}
            </fieldset>
          ) : (
            children
          )}
        </PageForm>
      </AppPage>
    </Form>
  );
}
