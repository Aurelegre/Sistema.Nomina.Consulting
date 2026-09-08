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

1. autenticación + usuarios + roles + permisos;
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

Implementación inicial en `feature/auth-bootstrap`, pendiente de integración:
modelos de seguridad, catálogo y seed administrador, login/logout, sesiones,
cambio obligatorio de contraseña temporal y protección backend de períodos.
Administración visual de usuarios/roles y ámbito departamental aún pendientes.
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
