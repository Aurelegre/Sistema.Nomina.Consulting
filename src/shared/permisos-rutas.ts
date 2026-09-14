import { type CodigoPermiso } from "../server/permisos/Helpers/permisos";

export const PERMISOS_RUTAS: Record<string, CodigoPermiso> = {
  "/empleados": "EMPLOYEES.VIEW",
  "/departamentos": "DEPARTMENTS.VIEW",
  "/periodos": "PAYROLL_PERIODS.VIEW",
  "/nomina": "PAYROLL.VIEW",
  "/ausencias": "ABSENCES.VIEW",
  "/asociacion": "ASSOCIATION.VIEW",
  "/reportes": "REPORTS.VIEW",
  "/usuarios": "USERS.VIEW",
  "/roles": "ROLES.VIEW",
  "/permisos": "PERMISSIONS.VIEW",
  "/configuracion": "SETTINGS.VIEW",
};
