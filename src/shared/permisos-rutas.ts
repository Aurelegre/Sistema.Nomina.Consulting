import { type CodigoPermiso } from "../server/permisos/Helpers/permisos";

export const PERMISOS_RUTAS: Record<string, CodigoPermiso> = {
  "/mi-departamento": "DEPARTMENT_EMPLOYEES.VIEW",
  "/empleados": "EMPLOYEES.VIEW",
  "/departamentos": "DEPARTMENTS.VIEW",
  "/periodos": "PAYROLL_PERIODS.VIEW",
  "/ausencias": "ABSENCES.VIEW",
  "/asociacion": "ASSOCIATION.PURCHASES.VIEW",
  "/asociacion/compras": "ASSOCIATION.PURCHASES.VIEW",
  "/usuarios": "USERS.VIEW",
  "/roles": "ROLES.VIEW",
  "/permisos": "PERMISSIONS.VIEW",
  "/configuracion": "SETTINGS.VIEW",
};

export const ANY_PERMISOS_RUTAS: Record<string, CodigoPermiso[]> = {
  "/reportes": ["REPORTS.VIEW", "ACCOUNTING_POLICY.VIEW"],
  "/nomina": ["PAYROLL.VIEW", "PAYROLL.PROCESS"],
  "/ausencias": ["ABSENCES.VIEW", "ABSENCES.HISTORICAL_VIEW"],
};
