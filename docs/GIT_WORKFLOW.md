# Git Workflow

## Ramas principales

### main
Rama de releases.

No hacer commits directos.

El propietario decide cuándo pasar develop a main.

### develop
Rama de integración.

Toda nueva feature debe partir de la versión más reciente de develop.

## Feature branches

Formato:

```text
feature/<nombre>
```

Ejemplos:

```text
feature/payroll-periods
feature/base-layout
feature/auth
feature/employees
feature/departments
```

## Flujo

```text
develop
  ↓
feature/x
  ↓
desarrollo
  ↓
lint + typecheck + pruebas
  ↓
PR → develop
  ↓
esperar confirmación del propietario
  ↓
merge
```

## Reglas

- Una feature por rama.
- No mezclar cambios no relacionados.
- No hacer merge de una feature hacia develop sin aprobación.
- No borrar la rama feature después del merge.
- Sincronizar una feature con develop cuando dependa de una feature recientemente integrada.
- Resolver conflictos preservando ambas funcionalidades.
- main queda fuera del trabajo del agente salvo instrucción explícita.

## Commits

Usar mensajes claros:

```text
feat: ...
fix: ...
refactor: ...
docs: ...
chore: ...
test: ...
```

## Pull Requests

El PR debe describir:
- objetivo;
- archivos/capas modificadas;
- reglas implementadas;
- pruebas ejecutadas;
- migraciones si existen;
- riesgos conocidos.

## Validación antes de PR

```bash
pnpm lint
pnpm typecheck
```

Cuando cambia Prisma:

```bash
pnpm db:generate
pnpm db:migrate
```

## Secretos

Nunca hacer commit de `.env`.
