import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UsuarioForm } from "@/features/usuarios";
import { getUsuarioForEdit } from "@/services/usuario.service";

export const metadata: Metadata = { title: "Editar usuário" };

export const dynamic = "force-dynamic";

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuario = await getUsuarioForEdit(id);
  if (!usuario) notFound();

  return <UsuarioForm usuarioId={id} defaultValues={usuario} />;
}
