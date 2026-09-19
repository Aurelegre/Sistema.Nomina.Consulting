import { TRPCError } from "@trpc/server";
import type z from "zod";

export function validar<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  input: unknown,
): T {
  const resultado = schema.safeParse(input);
  if (!resultado.success)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: resultado.error.issues[0]?.message ?? "Datos inválidos",
    });
  return resultado.data;
}
