# Autenticación, Roles y Permisos

## Estado

La autenticación todavía no está implementada en el proyecto actual y debe desarrollarse como una feature independiente.

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
PAYROLL_PERIODS.CLOSE

ABSENCES.VIEW
ABSENCES.CREATE
ABSENCES.APPROVE

PAYROLL.VIEW
PAYROLL.PROCESS
PAYROLL.CLOSE

REPORTS.VIEW
ACCOUNTING_POLICY.VIEW
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
permissionProcedure("PAYROLL_PERIODS.CLOSE")
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

Usuario con PAYROLL_PERIODS.CLOSE
→ además puede ver y ejecutar "Cerrar".
```

## Sistema anterior

El sistema ASP.NET anterior ya contiene los conceptos:

- Usuario
- Role
- Permiso
- RolesPermiso

Estos modelos deben reutilizarse conceptualmente, no copiarse automáticamente.

La implementación final debe ajustarse a Prisma, tRPC y la arquitectura 2026.
