# Arquitectura

## Estilo

Aplicación web modular construida sobre T3 Stack.

```text
Browser
  ↓
Next.js / React
  ↓
tRPC
  ↓
Services
  ↓
Prisma
  ↓
MySQL
```

## Frontend

- Next.js App Router
- React 19
- TypeScript
- TanStack React Query
- shadcn/ui
- Tailwind CSS como sistema de estilos subyacente

## Backend

Next.js ejecuta la capa server sobre Node.js.

La API se expone principalmente mediante tRPC.

### Router
Responsabilidades:
- entrada;
- Zod;
- autenticación;
- autorización;
- delegación a Service.

### Service
Responsabilidades:
- reglas de negocio;
- coordinación de operaciones;
- validaciones de dominio;
- transacciones cuando correspondan.

### Prisma
Responsabilidades:
- persistencia;
- consultas;
- relaciones;
- transacciones;
- migraciones.

## MySQL

Versión de desarrollo actual: MySQL 8.4.

Base local:
`nomina_consulting`

Shadow database:
base separada exclusivamente para Prisma Migrate.

## Estructura esperada

```text
src/
  app/
    (dashboard)/
    api/
    _components/
  components/
    ui/             # shadcn/ui
  server/
    api/
      routers/
    services/
    db.ts
  trpc/

prisma/
  schema.prisma
  migrations/

docs/
```

## Route groups

`(dashboard)` contiene módulos administrativos que comparten AppShell/sidebar.

Una futura agrupación `(auth)` contendrá login y pantallas sin sidebar.

## Componentes

Se prioriza composición con shadcn/ui.

Ejemplo:

```text
Page
  ↓
Card / DataTable / Dialog (shadcn/ui)
  ↓
tRPC hooks
```

## Stored Procedure

El proyecto 2026 exige un procedimiento de cálculo de nómina de fin de mes.

Debe coexistir con Prisma.

Invocación conceptual:

```ts
await db.$executeRaw`CALL sp_calcular_nomina(${periodoId})`;
```

## Función MySQL

También debe existir función para obtener nombre de mes.

## Nube

La solución final deberá desplegarse en infraestructura cloud.

La arquitectura debe mantener:
- variables de entorno;
- conexión MySQL configurable;
- ejecución Node.js;
- build reproducible;
- sin dependencias de rutas locales.

## Seguridad

Toda operación sensible debe aplicar:
- autenticación;
- autorización;
- validación Zod;
- control de errores;
- no exponer secretos.

## Logs

Se recomienda conservar conceptualmente:
- auditoría transaccional;
- log de errores.

La implementación exacta se realizará como feature.
