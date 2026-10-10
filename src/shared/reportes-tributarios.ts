export const REPORTES_TRIBUTARIOS = {
  IGSS_LABORAL: {
    titulo: "IGSS laboral",
    ruta: "igss-laboral",
    permiso: "IGSS_LABOR_REPORT",
    base: "Base sujeta a IGSS",
    importe: "Cuota laboral",
  },
  IGSS_PATRONAL: {
    titulo: "IGSS patronal",
    ruta: "igss-patronal",
    permiso: "IGSS_EMPLOYER_REPORT",
    base: "Base sujeta a IGSS",
    importe: "Aporte patronal",
  },
  ISR: {
    titulo: "ISR",
    ruta: "isr",
    permiso: "ISR_REPORT",
    base: "Ingresos del período",
    importe: "Retención mensual",
  },
} as const;
export type TipoReporte = keyof typeof REPORTES_TRIBUTARIOS;
export const tiposReporte = ["IGSS_LABORAL", "IGSS_PATRONAL", "ISR"] as const;
