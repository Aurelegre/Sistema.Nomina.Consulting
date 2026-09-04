# T3 + Prisma Starter

Scaffolding reutilizable para proyectos web con T3 Stack.

## Stack

- Next.js + React
- TypeScript
- tRPC
- TanStack React Query
- Prisma ORM
- MySQL
- Tailwind CSS
- Zod
- @t3-oss/env-nextjs
- ESLint y Prettier

Esta base no contiene lógica de negocio ni modelos específicos de una aplicación.

## Requisitos

- Node.js 22
- pnpm
- Docker opcional para MySQL local

## Inicio rápido

```bash
cp .env.example .env
corepack enable
pnpm install
docker compose up -d
pnpm db:generate
pnpm dev
```

## Prisma

El archivo `prisma/schema.prisma` está configurado para MySQL y comienza sin modelos de dominio.

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:push
pnpm db:studio
```

## Estructura

```text
prisma/
  schema.prisma

src/
  app/
    api/trpc/[trpc]/route.ts
    layout.tsx
    page.tsx
  server/
    api/
      routers/
      root.ts
      trpc.ts
    db.ts
  styles/
    globals.css
  trpc/
    query-client.ts
    react.tsx
  env.js
```

## Convención de ramas

- `main`: releases administradas por el propietario.
- `develop`: integración del proyecto.
- `feature/*`: una rama por feature.
- Las ramas de feature no se eliminan después del merge.

## Uso en otros proyectos

Cree un nuevo repositorio desde esta base, cambie el nombre del paquete y agregue autenticación, modelos Prisma, routers tRPC, servicios y UI según el dominio requerido.
