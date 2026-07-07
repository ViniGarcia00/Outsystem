import { redirect } from "next/navigation";

export default function Home() {
  // Enquanto não houver Dashboard, Propostas é a home da aplicação.
  redirect("/propostas");
}
