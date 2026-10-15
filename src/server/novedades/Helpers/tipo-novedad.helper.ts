import type { TipoNovedadNomina } from "@prisma/client";

export function tipoAdmitidoEnDepartamento(
  tipo: TipoNovedadNomina,
  codigo: string,
) {
  if (tipo === "PIEZAS") return codigo === "PRODUCCION";
  if (tipo === "VENTAS") return codigo === "MERCADEO";
  return true;
}
