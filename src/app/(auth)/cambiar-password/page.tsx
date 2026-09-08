import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { obtenerSesion } from "~/server/services/auth.service";
import { PrimeraPasswordForm } from "./primera-password-form";

export default async function PrimeraPasswordPage() {
  const sesion = await obtenerSesion(db, await headers());
  if (!sesion) redirect("/login");
  if (!sesion.usuario.debeCambiarPassword) redirect("/");
  return <PrimeraPasswordForm />;
}
