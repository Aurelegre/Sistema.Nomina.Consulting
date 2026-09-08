import { healthRouter } from "~/server/api/routers/health";
import { authRouter } from "~/server/api/routers/auth";
import { periodosNominaRouter } from "~/server/api/routers/periodos-nomina";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  health: healthRouter,
  periodosNomina: periodosNominaRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
