import z from "zod";
import {
  idSchema,
  nombreSchema,
  paginaSchema,
  registroVersionSchema,
} from "~/shared/acceso-schemas";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9._-]{3,100}$/,
    "Usa de 3 a 100 letras, números, puntos, guiones o guiones bajos",
  );

export const listarUsuariosSchema = paginaSchema
  .extend({
    estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
    rolId: idSchema.optional(),
  })
  .strict();
export const crearUsuarioSchema = z
  .object({ username: usernameSchema, nombre: nombreSchema, rolId: idSchema })
  .strict();
export const editarUsuarioSchema = registroVersionSchema
  .extend({ username: usernameSchema, nombre: nombreSchema })
  .strict();
export const asignarRolSchema = registroVersionSchema
  .extend({ rolId: idSchema })
  .strict();
export const asignarEmpleadoSchema = registroVersionSchema
  .extend({ empleadoId: idSchema.nullable() })
  .strict();
