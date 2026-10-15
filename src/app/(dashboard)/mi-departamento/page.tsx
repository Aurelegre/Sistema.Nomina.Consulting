import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { NovedadesView } from "~/features/novedades/novedades.view";
import { db } from "~/server/db";
import { obtenerSesion } from "~/server/sesion/Helpers/sesion.helper";
import { contextoNovedades } from "~/server/novedades/novedades.service";

export default async function MiDepartamentoPage() {
  const sesion = await obtenerSesion(db, await headers());
  if (!sesion) redirect("/login");
  if (sesion.usuario.debeCambiarPassword) redirect("/cambiar-password");
  const contexto = await contextoNovedades(db, {
    usuarioId: sesion.usuario.id,
    sesionId: sesion.id,
  }).catch((error: unknown) => {
    if (
      error instanceof TRPCError &&
      ["FORBIDDEN", "UNAUTHORIZED"].includes(error.code)
    )
      redirect("/sin-acceso");
    throw error;
  });
  return <NovedadesView contextoInicial={contexto} />;
}
