import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { PrimeraPasswordForm } from "./primera-password-form";
import { obtenerSesion } from "~/server/sesion/Helpers/sesion.helper";

export default async function PrimeraPasswordPage() {
  const sesion = await obtenerSesion(db, await headers());
  if (!sesion) redirect("/login");
  if (!sesion.usuario.debeCambiarPassword) redirect("/");
  return <PrimeraPasswordForm />;
}
