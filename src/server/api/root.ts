import { healthRouter } from "~/server/api/health";
import { authRouter } from "~/server/sesion/auth.router";
import { usuariosRouter } from "~/server/Usuarios/usuarios.router";
import { rolesRouter } from "~/server/Rol/roles.router";
import { permisosRouter } from "~/server/permisos/permisos.router";
import { periodosNominaRouter } from "~/server/Periodo-Nomina/periodos-nomina.router";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  usuarios: usuariosRouter,
  roles: rolesRouter,
  permisos: permisosRouter,
  auth: authRouter,
  health: healthRouter,
  periodosNomina: periodosNominaRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
