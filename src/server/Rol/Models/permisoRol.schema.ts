import z from "zod";
import { registroVersionSchema } from "~/shared/acceso-schemas";
import { PERMISOS } from "~/server/permisos/Helpers/permisos";

export const permisosRolSchema = registroVersionSchema
  .extend({
    codigos: z
      .array(
        z
          .string()
          .refine(
            (codigo) => Object.hasOwn(PERMISOS, codigo),
            "Permiso desconocido",
          ),
      )
      .max(Object.keys(PERMISOS).length)
      .refine(
        (codigos) => new Set(codigos).size === codigos.length,
        "Hay permisos duplicados",
      ),
  })
  .strict();
