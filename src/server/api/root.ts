import { cumpleanerosRouter } from "~/server/cumpleaneros/cumpleaneros.router";
import { tributarioRouter } from "~/server/reportes/tributario.router";
import { nominaRouter } from "~/server/nomina/nomina.router";
import { reportesRouter } from "~/server/reportes/reportes.router";
import { healthRouter } from "~/server/api/health";
import { comprasSolidariasRouter } from "~/server/compras-solidarias/compras-solidarias.router";
import { novedadesRouter } from "~/server/novedades/novedades.router";
import { authRouter } from "~/server/sesion/auth.router";
import { usuariosRouter } from "~/server/Usuarios/usuarios.router";
import { rolesRouter } from "~/server/Rol/roles.router";
import { permisosRouter } from "~/server/permisos/permisos.router";
import { periodosNominaRouter } from "~/server/Periodo-Nomina/periodos-nomina.router";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { departamentosRouter } from "~/server/departamentos/departamentos.router";
import { empleadosRouter } from "../empleados/empleados.router";
import { ausenciasRouter } from "../ausencias/ausencias.router";

export const appRouter = createTRPCRouter({
  cumpleaneros: cumpleanerosRouter,
  reportesTributarios: tributarioRouter,
  reportes: reportesRouter,
  nomina: nominaRouter,
  comprasSolidarias: comprasSolidariasRouter,
  novedades: novedadesRouter,
  departamentos: departamentosRouter,
  usuarios: usuariosRouter,
  roles: rolesRouter,
  permisos: permisosRouter,
  auth: authRouter,
  health: healthRouter,
  periodosNomina: periodosNominaRouter,
  empleados: empleadosRouter,
  ausencias: ausenciasRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
