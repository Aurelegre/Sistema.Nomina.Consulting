import type { Prisma } from "@prisma/client";

export const seleccionUsuario = {
  id: true,
  username: true,
  nombre: true,
  estado: true,
  rolId: true,
  empleadoId: true,
  version: true,
  debeCambiarPassword: true,
  fechaCreacion: true,
  rol: { select: { id: true, codigo: true, nombre: true, estado: true } },
} satisfies Prisma.UsuarioSelect;
