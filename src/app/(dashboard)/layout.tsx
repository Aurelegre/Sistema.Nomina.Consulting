import { AppShell } from "~/components/layout/app-shell";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { obtenerSesion } from "~/server/sesion/Helpers/sesion.helper";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const sesion = await obtenerSesion(db, await headers());
  if (!sesion) redirect("/login");
  if (sesion.usuario.debeCambiarPassword) redirect("/cambiar-password");
  return (
    <AppShell
      permisos={sesion.usuario.permisos}
      empleadoId={sesion.usuario.empleadoId}
    >
      {children}
    </AppShell>
  );
}
