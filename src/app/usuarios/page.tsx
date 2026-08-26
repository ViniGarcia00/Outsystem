import type { Metadata } from "next";

import { UsuariosList } from "@/features/usuarios";
import { listUsuarios } from "@/services/usuario.service";

export const metadata: Metadata = { title: "Usuários" };

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const usuarios = await listUsuarios(false);
  return <UsuariosList initialRows={usuarios} />;
}
