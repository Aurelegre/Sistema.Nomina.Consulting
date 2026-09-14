import { type CodigoPermiso } from "../src/server/permisos/Helpers/permisos";

export const ROLES_INICIALES: {
  codigo: string;
  nombre: string;
  descripcion: string;
  permisos: CodigoPermiso[];
}[] = [
  {
    codigo: "NOMINA_RRHH",
    nombre: "Nómina y Recursos Humanos",
    descripcion: "Operación de empleados y nómina",
    permisos: [
      "EMPLOYEES.VIEW",
      "EMPLOYEES.CREATE",
      "EMPLOYEES.UPDATE",
      "DEPARTMENTS.VIEW",
      "PAYROLL_PERIODS.VIEW",
      "PAYROLL_PERIODS.CREATE",
      "PAYROLL_PERIODS.CLOSE",
      "ABSENCES.VIEW",
      "ABSENCES.CREATE",
      "PAYROLL.VIEW",
      "PAYROLL.PROCESS",
      "PAYROLL.CLOSE",
      "PAYROLL_NEWS.VIEW",
      "PAYROLL_NEWS.MANAGE",
      "ADVANCES.VIEW",
      "ADVANCES.PROCESS",
      "ASSOCIATION.VIEW",
      "ASSOCIATION.MANAGE",
      "REPORTS.VIEW",
    ],
  },
  {
    codigo: "JEFE_DEPARTAMENTO",
    nombre: "Jefe de departamento",
    descripcion:
      "Requiere ámbito departamental al implementar empleados y ausencias",
    permisos: ["EMPLOYEES.VIEW", "ABSENCES.VIEW", "ABSENCES.APPROVE"],
  },
  {
    codigo: "FINANZAS_CONSULTA",
    nombre: "Finanzas · Consulta",
    descripcion: "Consulta de nóminas cerradas y reportes financieros",
    permisos: [
      "PAYROLL.VIEW",
      "REPORTS.VIEW",
      "ACCOUNTING_POLICY.VIEW",
      "SALARY_BOOK.VIEW",
    ],
  },
];
