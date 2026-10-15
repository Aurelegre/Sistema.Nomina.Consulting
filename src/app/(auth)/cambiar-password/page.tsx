import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { CambiarPasswordView } from "~/features/sesion/cambiar-password.view";
import { obtenerSesion } from "~/server/sesion/Helpers/sesion.helper";

export default async function PrimeraPasswordPage() {
  const sesion = await obtenerSesion(db, await headers());
  if (!sesion) redirect("/login");
  if (!sesion.usuario.debeCambiarPassword) redirect("/");
  return <CambiarPasswordView />;
}
