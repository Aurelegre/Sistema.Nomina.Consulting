import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { SesionView } from "~/features/sesion/sesion.view";
import { obtenerSesion } from "~/server/sesion/Helpers/sesion.helper";

export default async function LoginPage() {
  const sesion = await obtenerSesion(db, await headers());
  if (sesion)
    redirect(sesion.usuario.debeCambiarPassword ? "/cambiar-password" : "/");
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center p-6">
      <SesionView />
    </main>
  );
}
