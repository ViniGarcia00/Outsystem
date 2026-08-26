import type { Metadata } from "next";

import { UsuarioForm, usuarioDefaults } from "@/features/usuarios";

export const metadata: Metadata = { title: "Novo usuário" };

export const dynamic = "force-dynamic";

export default function NovoUsuarioPage() {
  return <UsuarioForm defaultValues={usuarioDefaults} />;
}
