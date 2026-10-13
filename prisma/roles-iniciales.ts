import { type CodigoPermiso } from "../src/server/permisos/Helpers/permisos";

// Mi Nómina se habilita por el vínculo usuario-empleado, no por PAYROLL.VIEW.
// Estos permisos no permiten consultar salarios ni ausencias de otros empleados.
const empleado: CodigoPermiso[] = ["ABSENCES.VIEW", "ABSENCES.CREATE"];
const jefatura: CodigoPermiso[] = [
  "DEPARTMENT_EMPLOYEES.VIEW",
  "DEPARTMENT_EMPLOYEES.DETAIL",
  "PAYROLL_NEWS.OVERTIME",
  "PAYROLL_NEWS.DOUBLE_TIME",
  "ABSENCES.APPROVE",
];
const empleadoRrhh: CodigoPermiso[] = [
  ...empleado,
  "EMPLOYEES.VIEW",
  "EMPLOYEES.CREATE",
  "EMPLOYEES.UPDATE",
  "DEPARTMENTS.VIEW",
  "ABSENCES.HISTORICAL_VIEW",
  "BIRTHDAYS_REPORT.VIEW",
  "BIRTHDAYS_REPORT.EXPORT",
];
const consultaFinanciera: CodigoPermiso[] = [
  "PAYROLL_PERIODS.VIEW",
  "PAYROLL.VIEW",
  "PAYROLL.DETAIL",
  "PAYROLL.EXPORT",
  "ACCOUNTING_POLICY.VIEW",
  "ACCOUNTING_POLICY.EXPORT",
  "IGSS_LABOR_REPORT.VIEW",
  "IGSS_LABOR_REPORT.EXPORT",
  "IGSS_EMPLOYER_REPORT.VIEW",
  "IGSS_EMPLOYER_REPORT.EXPORT",
  "ISR_REPORT.VIEW",
  "ISR_REPORT.EXPORT",
];
const empleadoFinanzas: CodigoPermiso[] = [
  ...empleado,
  ...consultaFinanciera,
  "ASSOCIATION.PURCHASES.VIEW",
  "ASSOCIATION.PURCHASES.CREATE",
  "ASSOCIATION.PURCHASES.UPDATE",
];

// Plantillas para roles nuevos: el seed conserva ajustes y asignaciones existentes.
// ADMINISTRADOR continúa creándose por separado en seed.ts.
// La jefatura real y el departamento se validan en servicios, no por el código del rol.
export const ROLES_INICIALES: {
  codigo: string;
  nombre: string;
  descripcion: string;
  permisos: CodigoPermiso[];
}[] = [
  {
    codigo: "JEFE_RRHH",
    nombre: "Jefe de Recursos Humanos",
    descripcion:
      "Operación global de RR. HH. y nómina; novedades y aprobación de ausencias del departamento dirigido.",
    permisos: [
      ...empleadoRrhh,
      ...jefatura,
      "DEPARTMENTS.MANAGE",
      "PAYROLL_PERIODS.VIEW",
      "PAYROLL_PERIODS.CREATE",
      "PAYROLL.VIEW",
      "PAYROLL.DETAIL",
      "PAYROLL.EXPORT",
      "PAYROLL.PROCESS",
    ],
  },
  {
    codigo: "JEFE_PRODUCCION",
    nombre: "Jefe de Producción",
    descripcion:
      "Accesos personales y gestión del departamento dirigido; registra horas y piezas producidas.",
    permisos: [...empleado, ...jefatura, "PAYROLL_NEWS.PRODUCTION"],
  },
  {
    codigo: "JEFE_MERCADEO",
    nombre: "Jefe de Mercadeo",
    descripcion:
      "Accesos personales y gestión del departamento dirigido; registra horas y ventas.",
    permisos: [...empleado, ...jefatura, "PAYROLL_NEWS.SALES"],
  },
  {
    codigo: "JEFE_FINANZAS",
    nombre: "Jefe de Finanzas",
    descripcion:
      "Operación financiera global, generación de reportes y compras; gestión del departamento dirigido.",
    permisos: [
      ...empleadoFinanzas,
      ...jefatura,
      "ASSOCIATION.PURCHASES.DELETE",
      "ACCOUNTING_POLICY.GENERATE",
      "IGSS_LABOR_REPORT.GENERATE",
      "IGSS_EMPLOYER_REPORT.GENERATE",
      "ISR_REPORT.GENERATE",
    ],
  },
  {
    codigo: "JEFE_LOGISTICA",
    nombre: "Jefe de Logística",
    descripcion:
      "Accesos personales, empleados, horas y aprobación de ausencias del departamento dirigido.",
    permisos: [...empleado, ...jefatura],
  },
  {
    codigo: "EMPLEADO_LOGISTICA",
    nombre: "Empleado de Logística",
    descripcion:
      "Consulta y solicitud de ausencias propias; Mi Nómina con empleado vinculado.",
    permisos: [...empleado],
  },
  {
    codigo: "EMPLEADO_RRHH",
    nombre: "Empleado de Recursos Humanos",
    descripcion:
      "Accesos personales y operación global de empleados, histórico de ausencias y cumpleañeros.",
    permisos: [...empleadoRrhh],
  },
  {
    codigo: "EMPLEADO_FINANZAS",
    nombre: "Empleado de Finanzas",
    descripcion:
      "Accesos personales, consulta y exportación financiera global; registro y edición de compras.",
    permisos: [...empleadoFinanzas],
  },
  {
    codigo: "EMPLEADO_MERCADEO",
    nombre: "Empleado de Mercadeo",
    descripcion:
      "Consulta y solicitud de ausencias propias; Mi Nómina con empleado vinculado.",
    permisos: [...empleado],
  },
  {
    codigo: "EMPLEADO_PRODUCCION",
    nombre: "Empleado de Producción",
    descripcion:
      "Consulta y solicitud de ausencias propias; Mi Nómina con empleado vinculado.",
    permisos: [...empleado],
  },
  {
    codigo: "AUDITOR",
    nombre: "Auditor",
    descripcion:
      "Consulta y exportación global de empleados, ausencias, nóminas, compras y reportes; sin escritura.",
    permisos: [
      ...consultaFinanciera,
      "EMPLOYEES.VIEW",
      "DEPARTMENTS.VIEW",
      "ABSENCES.VIEW",
      "ABSENCES.HISTORICAL_VIEW",
      "ASSOCIATION.PURCHASES.VIEW",
      "BIRTHDAYS_REPORT.VIEW",
      "BIRTHDAYS_REPORT.EXPORT",
    ],
  },
];
