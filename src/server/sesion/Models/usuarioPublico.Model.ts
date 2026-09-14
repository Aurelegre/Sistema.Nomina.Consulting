export const usuarioPublico = {
  id: true,
  username: true,
  nombre: true,
  debeCambiarPassword: true,
  estado: true,
  rol: { include: { permisos: { include: { permiso: true } } } },
} as const;
