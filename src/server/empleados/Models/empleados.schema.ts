import { z } from "zod";

import { paginaSchema, registroVersionSchema } from "~/shared/acceso-schemas";

const FECHA_MINIMA = new Date("1900-01-01T00:00:00.000Z");

const fechaSchema = z.coerce
  .date()
  .min(FECHA_MINIMA, "La fecha no puede ser anterior al 01/01/1900");

const fechaNacimientoSchema = fechaSchema.refine(
  (fecha) => fecha <= new Date(),
  "La fecha de nacimiento no puede ser futura",
);

const codigoEmpleadoSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(1, "El código es obligatorio")
  .max(50, "El código admite hasta 50 caracteres")
  .regex(
    /^[A-Z][A-Z0-9_-]*$/,
    "El código debe iniciar con una letra y solo admite letras, números, guion y guion bajo",
  );

const camposEmpleado = {
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(150, "El nombre admite hasta 150 caracteres")
    .transform((nombre) => nombre.replace(/\s+/g, " ")),

  fechaNacimiento: fechaNacimientoSchema,

  fechaIngreso: fechaSchema,

  salarioBase: z.coerce
    .number()
    .finite("El salario base no es válido")
    .positive("El salario base debe ser mayor que cero")
    .max(
      9_999_999_999.99,
      "El salario base no puede superar Q9,999,999,999.99",
    ),

  departamentoId: z
    .number()
    .int("El departamento no es válido")
    .positive("El departamento no es válido"),
};

const validarFechasEmpleado = (
  empleado: {
    fechaNacimiento: Date;
    fechaIngreso: Date;
  },
  ctx: z.RefinementCtx,
) => {
  if (empleado.fechaIngreso < empleado.fechaNacimiento) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["fechaIngreso"],
      message:
        "La fecha de ingreso no puede ser anterior a la fecha de nacimiento",
    });
  }
};

export const crearEmpleadoSchema = z
  .object({
    ...camposEmpleado,
    codigo: codigoEmpleadoSchema,
  })
  .strict()
  .superRefine(validarFechasEmpleado);

export const editarEmpleadoSchema = registroVersionSchema
  .extend(camposEmpleado)
  .strict()
  .superRefine(validarFechasEmpleado);

export const desactivarEmpleadoSchema = registroVersionSchema
  .extend({
    fechaSalida: fechaSchema,
  })
  .strict();

export const reactivarEmpleadoSchema = registroVersionSchema.strict();

export const listarEmpleadosSchema = paginaSchema.extend({
  departamentoId: z.number().int().positive().optional(),
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
  codigo: z.string().trim().toUpperCase().optional(),
  fechaIngresoDesde: fechaSchema.optional(),
  fechaIngresoHasta: fechaSchema.optional(),
});

export const obtenerEmpleadoSchema = registroVersionSchema.strict();
