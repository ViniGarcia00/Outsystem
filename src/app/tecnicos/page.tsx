import type { Metadata } from "next";

import { TecnicosList } from "@/features/tecnicos";
import { listTecnicos } from "@/services/tecnico.service";

export const metadata: Metadata = { title: "Técnicos" };

export const dynamic = "force-dynamic";

export default async function TecnicosPage() {
  const tecnicos = await listTecnicos(false);
  return <TecnicosList initialRows={tecnicos} />;
}
