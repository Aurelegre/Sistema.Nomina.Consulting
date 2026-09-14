import type { Salidas } from "~/shared/Models/acceso.model";
export type PeriodoNomina = Salidas["periodosNomina"]["listar"][number];
export type PeriodoSeleccionado = Pick<PeriodoNomina, "id" | "mes" | "anio">;
