import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";
export type Salidas = inferRouterOutputs<AppRouter>;
export type Identidad = Salidas["auth"]["me"];
