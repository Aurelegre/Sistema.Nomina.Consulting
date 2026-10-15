import type { Prisma } from "@prisma/client";
import type { ActorAcceso } from "../permisos/Models/ActorAcceso.Model";
import { actorVigente } from "../permisos/Helpers/acceso-policy";

//Se consulta la sesión vigente incluso si el servicio se invoca sin pasar por tRPC.
export async function autorizarEmpleados(
  db: Prisma.TransactionClient,
  actor: ActorAcceso,
  accion: "consultar" | "editar" | "crear" | "desactivar" | "reactivar",
) {
  const permiso =
    accion === "consultar"
      ? "EMPLOYEES.VIEW"
      : accion === "crear"
        ? "EMPLOYEES.CREATE"
        : "EMPLOYEES.UPDATE";

  await actorVigente(db, actor, [permiso]);
}
