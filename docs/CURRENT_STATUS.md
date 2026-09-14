# Estado actual

Fecha de referencia: septiembre 2026.

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

1. integrar y revisar administración de usuarios + roles + permisos;
2. empleados;
3. departamentos;
4. ausencias;
5. novedades de nómina;
6. Asociación Solidarista;
7. cálculo de IGSS;
8. ISR;
9. procesamiento de nómina;
10. stored procedure;
11. función nombre de mes;
12. póliza contable;
13. reportes;
14. histórico/auditoría;
15. deployment cloud;
16. pruebas y documentación final.

## Refactor UI pendiente

La rama `feature/frontend-entity-architecture` reorganiza las pantallas existentes
en `src/features`, con vistas, componentes, modales y modelos por entidad.
Incluye usuarios, roles, permisos, períodos, sesión e inicio. Los elementos de
layout y acceso reutilizados se ubican en `src/components`.
Períodos utiliza los componentes shadcn/ui existentes para formulario, tabla y
confirmación de cierre. La integración a develop queda pendiente de revisión
y autorización del propietario. No agrega módulos funcionales ni cambios de BD.

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
`feature/users-roles-permissions`, pendiente de integración. Incluye contraseñas
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
