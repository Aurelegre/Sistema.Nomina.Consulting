import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  sessionProcedure,
} from "../api/trpc";
import { iniciarSesion, cambiarPrimeraPassword } from "./auth.service";
import { passwordSchema } from "./Helpers/password";
import { cookieSesion } from "./Helpers/sesion.helper";

// Router de autenticación que maneja el inicio de sesión, la obtención de información del usuario autenticado, el cambio de contraseña inicial y el cierre de sesión.
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
    // Maneja la mutación de inicio de sesión, verificando las credenciales del usuario y generando un token de sesión.
    .mutation(async ({ ctx, input }) => {
      const resultado = await iniciarSesion(
        ctx.db,
        input.username,
        input.password,
      );
      ctx.responseHeaders.append("Set-Cookie", cookieSesion(resultado.token));
      return { debeCambiarPassword: resultado.debeCambiarPassword };
    }),
  // Obtiene la información del usuario autenticado a partir de la sesión activa.
  me: sessionProcedure.query(({ ctx }) => ctx.sesion.usuario),
  // Maneja la mutación de cambio de contraseña inicial, permitiendo al usuario cambiar su contraseña temporal por una nueva.
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
  // Maneja la mutación de cierre de sesión, eliminando la sesión activa y borrando la cookie de sesión.
  logout: sessionProcedure.mutation(async ({ ctx }) => {
    await ctx.db.sesion.deleteMany({ where: { id: ctx.sesion.id } });
    ctx.responseHeaders.append("Set-Cookie", cookieSesion("", true));
    return { ok: true };
  }),
});
