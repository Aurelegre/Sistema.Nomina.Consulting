import type { Salidas } from "~/shared/Models/acceso.model";
export function filtrarPermisos(
  permisos: Salidas["permisos"]["listar"],
  modulo: string,
  busqueda: string,
) {
  return permisos.filter(
    (p) =>
      (modulo === "todos" || p.modulo === modulo) &&
      `${p.nombre} ${p.codigo} ${p.descripcion ?? ""}`
        .toLocaleLowerCase()
        .includes(busqueda.toLocaleLowerCase()),
  );
}
