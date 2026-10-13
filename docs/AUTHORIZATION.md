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

ADMINISTRADOR se crea por separado en el seed y conserva el catálogo completo.
Las siguientes once plantillas se definen en `prisma/roles-iniciales.ts`:

| Rol | Alcance adicional a sus accesos personales |
| --- | --- |
| EMPLEADO_LOGISTICA | Ninguno: ausencias propias y Mi Nómina. |
| EMPLEADO_PRODUCCION | Ninguno: ausencias propias y Mi Nómina. |
| EMPLEADO_MERCADEO | Ninguno: ausencias propias y Mi Nómina. |
| EMPLEADO_RRHH | Gestión global de empleados, consulta de departamentos, histórico global de ausencias y cumpleañeros con exportación. |
| EMPLEADO_FINANZAS | Consulta y exportación global de nómina, póliza, IGSS e ISR; consulta, creación y edición de compras solidarias. |
| JEFE_LOGISTICA | Accesos del empleado de su área más gestión de empleados, horas extras/dobles y resolución de ausencias del departamento dirigido. |
| JEFE_PRODUCCION | Lo anterior más registro de piezas de Producción. |
| JEFE_MERCADEO | Lo anterior más registro de ventas de Mercadeo. |
| JEFE_RRHH | Accesos de EMPLEADO_RRHH y jefatura; administración global de departamentos, creación de períodos, procesamiento, consulta, detalle y exportación de nómina. |
| JEFE_FINANZAS | Accesos de EMPLEADO_FINANZAS y jefatura; eliminación de compras y generación de póliza, IGSS e ISR. |
| AUDITOR | Consulta global de empleados, departamentos, ausencias, compras, períodos, nómina y reportes; exportaciones, sin crear, editar, eliminar, aprobar ni procesar. |

Cada jefe incluye todos los permisos de su empleado equivalente. Mi Nómina
requiere usuario vinculado a empleado activo y no necesita PAYROLL.VIEW.
Las ausencias propias requieren ese vínculo; el rol no lo crea automáticamente.

La gestión departamental usa DEPARTMENT_EMPLOYEES y los permisos específicos
de novedades. Además requiere jefatura real asignada en un departamento activo.
Producción y Mercadeo conservan las validaciones de departamento en los servicios.
El código del rol no asigna ni cambia el departamento del empleado.

EMPLOYEES, DEPARTMENTS.MANAGE, PAYROLL, compras e informes tributarios tienen
alcance global: se asignan deliberadamente a RR. HH., Finanzas o Auditor según
esta matriz. No se concede DEPARTMENTS.MANAGE a todas las jefaturas, porque
permite administrar el catálogo completo, no solo el departamento dirigido.
Solo ADMINISTRADOR administra usuarios, roles, permisos y configuración.

Las plantillas omiten permisos genéricos sin operación específica (anticipos,
novedades genéricas, asociación genérica y libro de salarios). El libro se consulta
mediante la nómina existente. Cada reporte dispone de sus propios permisos.

Aplicación: ejecutar explícitamente `pnpm db:seed`. El seed crea los roles que
no existen; no elimina los anteriores, reasigna usuarios ni sobrescribe permisos
personalizados de roles existentes. Los roles anteriores pueden retirarse desde
la administración después de revisar sus usuarios. No se requiere migración.

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


## Cumpleañeros

BIRTHDAYS_REPORT.VIEW autoriza la consulta global de cumpleaños por mes, estado
y departamento. BIRTHDAYS_REPORT.EXPORT permite CSV/PDF junto con VIEW. La ruta
y el portal admiten VIEW sin exigir REPORTS.VIEW. Asignación inicial: ADMINISTRADOR.
