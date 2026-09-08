# AGENTS.md

## Propósito

Este archivo define las instrucciones persistentes para cualquier agente de desarrollo que trabaje en `Sistema.Nomina.Consulting`.

Antes de modificar código, leer en este orden:

1. `docs/PROJECT_CONTEXT.md`
2. `docs/REQUIREMENTS_2026.md`
3. `docs/BUSINESS_RULES.md`
4. `docs/ARCHITECTURE.md`
5. `docs/AUTHORIZATION.md`
6. `docs/UI_GUIDELINES.md`
7. `docs/GIT_WORKFLOW.md`
8. `docs/CURRENT_STATUS.md`
9. Cuando una feature pueda reutilizar lógica o datos del sistema anterior:
   - `docs/internal/LEGACY_SYSTEM_REFERENCE.md`
   - `docs/internal/LEGACY_DATABASE_MAPPING.md`
   - `docs/internal/MIGRATION_DECISIONS.md`

## Fuente de verdad

La fuente de verdad funcional es:

1. `docs/REQUIREMENTS_2026.md`
2. `docs/BUSINESS_RULES.md`

La aplicación ASP.NET Core 8 anterior sirve únicamente como referencia interna de implementación.

Si una regla del sistema anterior contradice los requerimientos 2026, SIEMPRE implementar la regla 2026.

## Stack

- Node.js 22
- Next.js 15 con App Router
- React 19
- TypeScript
- tRPC
- TanStack React Query
- Prisma ORM 6.19.3
- MySQL 8.4
- pnpm 11.25.0
- Tailwind CSS como motor de estilos
- shadcn/ui como biblioteca principal de componentes UI
- Zod para validación

## Arquitectura obligatoria

Mantener esta separación:

```text
React / Next.js
      ↓
tRPC Router
      ↓
Service
      ↓
Prisma
      ↓
MySQL
```

Reglas:

- No colocar reglas de negocio importantes directamente en componentes React.
- No colocar reglas de negocio complejas directamente en routers tRPC.
- Los routers validan entrada, autorización y delegan en Services.
- Los Services contienen reglas de negocio y coordinan Prisma.
- Prisma se usa para persistencia y consultas.
- Stored procedures y funciones MySQL se usan cuando el requerimiento 2026 lo exige.

## Frontend

Reglas obligatorias:

- Usar componentes de shadcn/ui como primera opción.
- Evitar construir Buttons, Inputs, Selects, Dialogs, Tables, Cards, Dropdowns, Tooltips, Badges, Forms y similares con clases Tailwind manuales si existe un componente shadcn/ui adecuado.
- Tailwind manual se permite principalmente para layout, espaciado y composición cuando shadcn/ui no cubre el caso.
- No usar `window.alert`, `window.confirm` ni `window.prompt`.
- Alertas y confirmaciones importantes: Dialog/AlertDialog de shadcn/ui.
- Formularios con más de 2 campos: Dialog/Sheet de shadcn/ui.
- Edición de cualquier entidad: siempre modal.
- Reutilizar el layout con sidebar izquierdo colapsable.
- La UI existente que todavía use Tailwind manual puede refactorizarse progresivamente cuando se toque esa feature.

## Autenticación y autorización

La autenticación todavía debe implementarse como feature independiente.

Objetivo:

- Usuario autenticado.
- Sesión segura.
- Roles.
- Permisos por rol.
- Autorización por permiso en procedimientos tRPC.
- La UI puede ocultar acciones sin permiso, pero la autorización real debe existir en backend.
- No confiar únicamente en controles visuales.

Leer `docs/AUTHORIZATION.md`.

## Git

- `main`: rama de releases. No modificar directamente.
- `develop`: rama de integración.
- Crear una rama `feature/*` por funcionalidad.
- No desarrollar features directamente en `develop`.
- No hacer merge de feature → develop sin confirmación del propietario.
- Después del merge, NO eliminar la rama feature.
- El propietario administra el paso de `develop` a `main`.

## Validación

Antes de considerar una feature terminada:

```bash
pnpm lint
pnpm typecheck
```

Si hay cambios Prisma:

```bash
pnpm db:generate
pnpm db:migrate
```

Validar también funcionalmente la UI afectada.

## Base de datos

Desarrollo local:

- MySQL en `127.0.0.1:3306`.
- Base principal: `nomina_consulting`.
- Prisma Migrate debe utilizar una shadow database separada.
- Nunca usar la base principal como shadow database.
- Nunca versionar credenciales reales.

## Seguridad de archivos

Nunca versionar:

- `.env`
- contraseñas
- connection strings reales
- API keys
- secretos de sesión
- credenciales SMTP

Sí versionar valores de ejemplo en `.env.example`.

## Sistema anterior

Repositorio interno de referencia:

`https://github.com/Aurelegre/Sistema.Gestion.Nomina-`

Rama analizada:

`develop`

No reintroducir funcionalidades legacy fuera del alcance 2026 salvo indicación explícita.
