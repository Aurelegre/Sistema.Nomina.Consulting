import { healthRouter } from "~/server/api/routers/health";
import { periodosNominaRouter } from "~/server/api/routers/periodos-nomina";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  periodosNomina: periodosNominaRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
