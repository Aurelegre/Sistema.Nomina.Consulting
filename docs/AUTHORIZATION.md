# Autenticación, Roles y Permisos

## Estado

La autenticación inicial está integrada en develop. La rama
`feature/users-roles-permissions` agrega la administración de usuarios, roles y
permisos. Ver `AUTH_BOOTSTRAP.md` para acceso inicial y `ACCESS_MANAGEMENT.md`
para pantallas, permisos, reglas de delegación y control de concurrencia.

## Objetivo

Implementar control de acceso basado en usuarios, roles y permisos.

Modelo conceptual:

```text
Usuario
  ↓
Rol
  ↓
Permisos
```

Un rol puede tener múltiples permisos.

Un permiso puede pertenecer a múltiples roles.

## Entidades esperadas

### Usuario

Datos mínimos:

- id
- username o email
- passwordHash
- estado
- rolId
- fechaCreacion
- fechaActualizacion

### Rol

- id
- nombre
- descripcion
- estado

### Permiso

- id
- codigo
- nombre
- descripcion

### RolPermiso

Tabla pivote:

- rolId
- permisoId

## Roles funcionales iniciales

Como mínimo se contemplan:

### ADMINISTRADOR

Acceso completo:

- usuarios;
- roles;
- permisos;
- empleados;
- departamentos;
- períodos;
- nómina;
- reportes;
- configuración.

### NOMINA_RRHH

Gestión operativa:

- empleados;
- períodos;
- novedades;
- ausencias;
- anticipos;
- procesamiento de nómina;
- consultas relacionadas.

### JEFE_DEPARTAMENTO

Acceso limitado a su ámbito:

- consultar empleados de su departamento;
- revisar solicitudes de ausencia;
- aprobar o rechazar ausencias;
- consultar información autorizada.

### FINANZAS_CONSULTA

Principalmente:

- consultar nóminas cerradas;
- reportes;
- póliza contable;
- IGSS;
- ISR;
- Libro de Salarios.

Los nombres y distribución final pueden ajustarse durante la feature de autenticación, pero el diseño debe conservar autorización granular.

## Convención de permisos

Usar códigos explícitos y estables.

Ejemplos:

```text
USERS.VIEW
USERS.CREATE
USERS.UPDATE
USERS.DISABLE

ROLES.VIEW
ROLES.MANAGE

EMPLOYEES.VIEW
EMPLOYEES.CREATE
EMPLOYEES.UPDATE

DEPARTMENTS.VIEW
DEPARTMENTS.MANAGE

PAYROLL_PERIODS.VIEW
PAYROLL_PERIODS.CREATE

ABSENCES.VIEW
ABSENCES.CREATE
ABSENCES.APPROVE

PAYROLL.VIEW
PAYROLL.PROCESS
PAYROLL.DETAIL
PAYROLL.EXPORT

REPORTS.VIEW
ACCOUNTING_POLICY.VIEW
ACCOUNTING_POLICY.GENERATE
ACCOUNTING_POLICY.EXPORT
SALARY_BOOK.VIEW
```

## Backend

La autorización real debe ocurrir en backend.

Patrón deseado:

```text
publicProcedure
protectedProcedure
permissionProcedure("PAYROLL.PROCESS")
```

Ejemplo conceptual:

```ts
permissionProcedure("PAYROLL.PROCESS")
  .input(...)
  .mutation(...)
```

No confiar únicamente en:

```tsx
{canClose && <Button />}
```

Ocultar el botón mejora UX, pero el backend debe rechazar accesos no autorizados.

## Sesión

Requisitos:

- usuario debe autenticarse antes de acceder a módulos protegidos;
- las credenciales nunca se almacenan en texto plano;
- usar hashing seguro;
- sesión con expiración;
- logout invalida la sesión;
- rutas administrativas deben protegerse;
- los datos de sesión deben permitir obtener usuario, rol y permisos.

## UI

El sidebar debe mostrar únicamente módulos permitidos o deshabilitar/ocultar opciones según política definida.

Las acciones de tabla también dependen de permisos.

Ejemplo:

```text
Usuario con PAYROLL_PERIODS.VIEW
→ puede consultar períodos.

Usuario con PAYROLL.PROCESS
→ puede generar la nómina; su cierre se confirma automáticamente con el cálculo.
```

`/mi-nomina` exige usuario con empleado vinculado y deriva su ámbito de la sesión.
No concede acceso administrativo ni exportación global. Se conserva el bloqueo
de empleados inactivos. Los permisos de cierre manual fueron retirados.

## Sistema anterior

El sistema ASP.NET anterior ya contiene los conceptos:

- Usuario
- Role
- Permiso
- RolesPermiso

Estos modelos deben reutilizarse conceptualmente, no copiarse automáticamente.

La implementación final debe ajustarse a Prisma, tRPC y la arquitectura 2026.


## Reportes internos de IGSS e ISR

| Reporte | Consulta | Generación | Exportación CSV/PDF |
| --- | --- | --- | --- |
| IGSS laboral | IGSS_LABOR_REPORT.VIEW | IGSS_LABOR_REPORT.GENERATE | IGSS_LABOR_REPORT.EXPORT |
| IGSS patronal | IGSS_EMPLOYER_REPORT.VIEW | IGSS_EMPLOYER_REPORT.GENERATE | IGSS_EMPLOYER_REPORT.EXPORT |
| ISR | ISR_REPORT.VIEW | ISR_REPORT.GENERATE | ISR_REPORT.EXPORT |

Generar y exportar requieren además VIEW del mismo tipo. La autorización se
comprueba en backend. VIEW permite abrir la ruta y el portal de reportes sin
exigir REPORTS.VIEW. ADMINISTRADOR recibe los nueve permisos en la migración.
