import type { Metadata } from "next";

import { TecnicoForm, tecnicoDefaults } from "@/features/tecnicos";

export const metadata: Metadata = { title: "Novo técnico" };

export default function NovoTecnicoPage() {
  return <TecnicoForm defaultValues={tecnicoDefaults} />;
}
