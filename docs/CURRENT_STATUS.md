# Estado actual

Fecha de referencia: 22 de septiembre de 2026.

## Ausencias

Implementado en `feature/absences`: creación propia, listado y detalle por ámbito,
aprobación/rechazo definitivo por jefe vigente del departamento histórico,
autoaprobación permitida y decisión salarial del jefe sin cálculos monetarios.
Incluye vínculo opcional usuario-empleado administrable por permiso, bloqueo de
login/sesiones por empleado inactivo y coordinación con cierre de períodos.
Reutiliza la migración base existente. Incluye frontend en `/ausencias`: historial
propio y creación modal, navegación superior a revisión del departamento,
filtros por empleado/estado/fechas, detalle y confirmaciones de aprobación o
rechazo. La navegación y las rutas exigen vínculo y jefatura según el apartado.
Ver `ABSENCES.md`.

## Empleados

Implementado en `feature/employees`, pendiente de revisión e integración:
listado paginado, búsqueda y filtros, detalle, editor modal para creación y
actualización de datos y salario, baja con fecha de salida y recontratación.
Incluye permisos, versiones y validaciones transaccionales de departamentos
activos y jefaturas. La creación de departamentos exige jefe activo y la
desactivación se bloquea si tiene empleados asignados. Se reutilizan los modelos
Prisma existentes de la rama. Detalles y validación en `EMPLOYEES.md`.

## Base técnica

Completado:

- Next.js
- React
- TypeScript
- tRPC
- TanStack Query
- Prisma
- MySQL
- Tailwind
- pnpm
- ESLint
- configuración de entorno
- health check
- migraciones Prisma

## PeriodoNomina

Estado: integrado en develop.

Implementado:

- modelo Prisma;
- migración;
- mes;
- año;
- estado ABIERTO/CERRADO;
- fecha de creación;
- fecha de cierre;
- restricción única mes+año;
- listar;
- obtener;
- crear;
- cerrar;
- Service;
- router tRPC;
- validación Zod;
- UI;
- confirmación de cierre.

## Base Layout

Estado: integrado en develop.

Implementado:

- AppShell;
- sidebar izquierdo;
- expandido/contraído;
- persistencia en localStorage;
- responsive;
- drawer móvil;
- header;
- navegación;
- opción activa;
- placeholders de módulos.

## Pendiente / próximas features

Orden sugerido:

1. revisar e integrar departamentos (`feature/departments`);
2. revisar e integrar empleados (`feature/employees`), con jefe obligatorio al crear departamentos y bloqueo de desactivación si tienen empleados asignados;
3. ausencias;
4. novedades de nómina;
5. Asociación Solidarista;
6. cálculo de IGSS;
7. ISR;
8. procesamiento de nómina;
9. stored procedure;
10. función nombre de mes;
11. póliza contable;
12. reportes;
13. histórico/auditoría;
14. deployment cloud;
15. pruebas y documentación final.

## Departamentos

Implementado en `feature/departments`, pendiente de revisión e integración:
catálogo ampliable con cinco departamentos iniciales, creación, edición y
desactivación por permisos, códigos únicos e inmutables y estado ACTIVO/INACTIVO
visible en tabla. Incluye control de concurrencia, formularios modales y
confirmación shadcn/ui. Las cuentas iniciales quedan pendientes de configurar;
los nuevos departamentos requieren cuenta. La asignación obligatoria de jefe y
la validación de empleados al desactivar se incorporan en `feature/employees`.
Detalles en `DEPARTMENTS.md`.

## Arquitectura frontend

La rama `feature/frontend-entity-architecture` reorganiza las pantallas existentes
en `src/features`, con vistas, componentes, modales y modelos por entidad.
Incluye usuarios, roles, permisos, períodos, sesión e inicio. Los elementos de
layout y acceso reutilizados se ubican en `src/components`.
Períodos utiliza los componentes shadcn/ui existentes para formulario, tabla y
confirmación de cierre. Integrada en develop mediante el PR #12.
No agregó módulos funcionales ni cambios de BD.

Validación de la refactorización: `pnpm lint`, `pnpm typecheck` y `pnpm build`
correctos; cuatro pruebas Playwright aprobadas para acceso, usuarios/roles,
autenticación y períodos. La prueba de períodos también verifica cancelación,
duplicados, cierre persistido y ausencia de desbordamiento horizontal en móvil.

El proyecto adoptó shadcn/ui como estándar después de las primeras features.

Por tanto, algunos componentes actuales todavía usan Tailwind manual.

Regla:

Cuando se toque una feature existente, migrar progresivamente sus componentes interactivos a shadcn/ui.

Prioridad:
- dialogs;
- buttons;
- forms;
- tables;
- selects;
- badges;
- tooltips.

## Autenticación

Implementación inicial de `feature/auth-bootstrap`, integrada en develop:
modelos de seguridad, catálogo y seed administrador, login/logout, sesiones,
cambio obligatorio de contraseña temporal y protección backend de períodos.
Administración visual de usuarios/roles/permisos implementada en
`feature/users-roles-permissions`, integrada en develop. Incluye contraseñas
temporales, revocación de sesiones, delegación limitada y control de concurrencia.
El ámbito departamental queda pendiente de los módulos de empleados/ausencias.
Detalles: `ACCESS_MANAGEMENT.md`.
Preparación de acceso y despliegue: `AUTH_BOOTSTRAP.md`.

El diseño objetivo está en `AUTHORIZATION.md`.

## Base de datos

MySQL local:
`127.0.0.1:3306`

Base:
`nomina_consulting`

Prisma Migrate necesita shadow database separada.

## Sistema legacy

El repositorio anterior ya fue analizado y su información de reutilización se conserva en `docs/internal/`.
