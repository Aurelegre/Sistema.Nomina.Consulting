import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "~/server/db";
import { obtenerSesion } from "~/server/services/auth.service";
import { type CodigoPermiso } from "~/shared/permisos";

export const createTRPCContext = async (opts: {
  headers: Headers;
  responseHeaders?: Headers;
}) => ({
  db,
  ...opts,
  responseHeaders: opts.responseHeaders ?? new Headers(),
  sesion: await obtenerSesion(db, opts.headers),
});

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Permite únicamente identidad, logout y cambio inicial mientras la clave sea temporal.
export const sessionProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.sesion)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Inicia sesión para continuar",
    });
  return next({ ctx: { ...ctx, sesion: ctx.sesion } });
});

export const protectedProcedure = sessionProcedure.use(({ ctx, next }) => {
  if (ctx.sesion.usuario.debeCambiarPassword)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Debes cambiar tu contraseña temporal",
    });
  return next({ ctx });
});

export const permissionProcedure = (codigo: CodigoPermiso) =>
  protectedProcedure.use(({ ctx, next }) => {
    if (!ctx.sesion.usuario.permisos.includes(codigo))
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "No tienes permiso para esta operación",
      });
    return next({ ctx });
  });
