import type { Prisma } from "@prisma/client";
import { actorVigente } from "~/server/permisos/Helpers/acceso-policy";
import type { ActorAcceso } from "~/server/permisos/Models/ActorAcceso.Model";

// Se consulta la sesión vigente incluso si el servicio se invoca sin pasar por tRPC.
export async function autorizarDepartamentos(
  db: Prisma.TransactionClient,
  actor: ActorAcceso,
  accion: "consultar" | "editar" | "crear" | "desactivar",
) {
  await actorVigente(db, actor, [
    accion === "consultar" ? "DEPARTMENTS.VIEW" : "DEPARTMENTS.MANAGE",
  ]);
}
