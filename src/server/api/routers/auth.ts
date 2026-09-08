import { z } from "zod";
import { createTRPCRouter, publicProcedure, sessionProcedure } from "../trpc";
import {
  iniciarSesion,
  cambiarPrimeraPassword,
  cookieSesion,
} from "../../services/auth.service";
import { passwordSchema } from "../../security/password";

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(
      z.object({
        username: z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9._-]{3,100}$/),
        password: z.string().min(1).max(128),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const resultado = await iniciarSesion(
        ctx.db,
        input.username,
        input.password,
      );
      ctx.responseHeaders.append("Set-Cookie", cookieSesion(resultado.token));
      return { debeCambiarPassword: resultado.debeCambiarPassword };
    }),
  me: sessionProcedure.query(({ ctx }) => ctx.sesion.usuario),
  cambiarPrimeraPassword: sessionProcedure
    .input(
      z.object({
        passwordActual: z.string().min(1).max(128),
        nuevaPassword: passwordSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await cambiarPrimeraPassword(
        ctx.db,
        ctx.sesion.usuario.id,
        input.passwordActual,
        input.nuevaPassword,
      );
      ctx.responseHeaders.append("Set-Cookie", cookieSesion("", true));
      return { ok: true };
    }),
  logout: sessionProcedure.mutation(async ({ ctx }) => {
    await ctx.db.sesion.deleteMany({ where: { id: ctx.sesion.id } });
    ctx.responseHeaders.append("Set-Cookie", cookieSesion("", true));
    return { ok: true };
  }),
});
