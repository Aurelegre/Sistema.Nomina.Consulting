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

### Organización por entidad

El frontend se organiza en `src/features/<entidad>`. Las entidades implementadas
son usuarios, roles, permisos y períodos de nómina; las pantallas existentes de
sesión e inicio también se agrupan como módulos de interfaz.

```text
src/features/usuarios/
  usuarios.view.tsx
  Components/
    usuarios-table.tsx
    Modals/
      editorUsuario.modal.tsx
      confirmarUsuario.modal.tsx
      credencialUsuario.modal.tsx
  Models/
    Usuario.model.ts
    editorUsuario.model.ts
  Helpers/                 # solo cuando existan funciones puras propias
```

- Las vistas componen la pantalla y coordinan selección, filtros y actualización
  de consultas. Las tablas notifican acciones mediante callbacks tipados.
- Los modales contienen los formularios y operaciones de su responsabilidad.
  Creación y edición pueden compartir un editor cuando reutilizan el mismo
  formulario. No se crean modales para acciones inexistentes.
- `Models/*.model.ts` contiene contratos específicos de la UI, derivados de las
  salidas de tRPC cuando corresponda. JSX utiliza `.tsx`.
- `Helpers` contiene funciones puras. Los hooks reutilizables se ubican en
  `Hooks`; los compartidos están en `src/shared/Hooks`.
- Las rutas de `src/app` conservan autorización, redirecciones y composición del
  servidor. Las vistas cliente consumen tRPC, nunca servicios ni Prisma.
- `src/components/ui` conserva shadcn/ui. El layout, controles de acceso comunes
  y la presentación genérica de módulos pendientes viven en `src/components`.
- Los contratos Zod ya compartidos con formularios deben permanecer libres de
  dependencias exclusivas del servidor. Las reglas de negocio y la autorización
  efectiva siguen en backend.
- No se crean carpetas vacías ni módulos funcionales para entidades pendientes.

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
  features/
    usuarios/
    roles/
    permisos/
    periodos-nomina/
    sesion/
    inicio/
  components/
    ui/             # shadcn/ui
    layout/
    acceso/
    navigation/
  shared/
    Models/
    Hooks/
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

`(auth)` contiene login y cambio de contraseña, sin sidebar.

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
