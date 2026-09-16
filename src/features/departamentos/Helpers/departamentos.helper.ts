import type { Departamento } from "../Models/departamentos.model";

export function filtrarDepartamentos(
  departamentos: Departamento[],
  busqueda: string,
) {
  const normalizar = (valor: string) =>
    valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase();
  const criterio = normalizar(busqueda.trim());
  return departamentos.filter((departamento) =>
    normalizar(
      `${departamento.codigo} ${departamento.nombre} ${departamento.cuentaContable ?? ""}`,
    ).includes(criterio),
  );
}
