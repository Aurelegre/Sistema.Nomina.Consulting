import type { Prisma } from "@prisma/client";

export const empleadoAsignadoUsuario = {
  id: true,
  nombre: true,
  codigo: true,
  departamentoId: true,
  departamento: { select: { id: true, nombre: true } },
} satisfies Prisma.EmpleadoSelect;
