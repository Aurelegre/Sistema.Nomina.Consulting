# Migration Decisions

> DOCUMENTO INTERNO.
> Este documento explica decisiones de reutilización técnica.
> No debe formar parte de la entrega académica.

## Estrategia general

No se está haciendo una conversión archivo por archivo de C# a TypeScript.

La estrategia es:

```text
Sistema ASP.NET Core 8
      ↓
Dominio / reglas / modelos / consultas como referencia
      ↓
Reimplementación
      ↓
Next.js + React + tRPC + Prisma + MySQL
```

## Base de datos

Legacy:
- SQL Server
- Entity Framework Core

2026:
- MySQL
- Prisma

Se reutiliza el conocimiento del modelo, no el proveedor ni EF Core.

## Anticipo

Legacy:
```text
45% del salario base
```

2026:
```text
50% del salario base
```

Decisión:
- reutilizar estructura/concepto;
- reemplazar porcentaje.

## Horas extras

Legacy:
```text
ValorHora = Salario / (30 × 8)
HoraExtra = ValorHora × 1.5
```

2026:
mismo factor 1.5.

Decisión:
reutilización alta.

## Horas dobles

Legacy:
festivos/domingo a doble.

2026:
mismo concepto.

Decisión:
reutilización alta.

## Producción

Legacy:
```text
Piezas × Q0.01
```

2026:
igual.

Decisión:
reutilizar regla.

## Comisiones

Legacy:
departamento Ventas.

Rangos:
- 0–100000 → 0%
- 100001–200000 → 2.5%
- 200001–400000 → 3.5%
- 400001+ → 4.5%

2026:
mismos rangos, pero aplica a Mercadeo.

Decisión:
- reutilizar cálculo;
- cambiar departamento aplicable.

## IGSS laboral

Legacy observado:
```text
4.87%
```

2026:
```text
4.83%
```

Decisión:
NO copiar porcentaje legacy.

## IGSS patronal

Legacy:
```text
12.67%
```

2026:
```text
10.67%
```

Decisión:
NO copiar porcentaje legacy.

## ISR

Legacy contiene una implementación de proyección anual y reglas específicas.

2026:
debe calcularse mediante proyección anual conforme a rentas del trabajo en relación de dependencia en Guatemala.

Decisión:
- reutilizar estructura mental del cálculo;
- no copiar automáticamente umbrales o condiciones legacy;
- implementar según BUSINESS_RULES y análisis vigente.

## Asociación Solidarista

Legacy:
existe tienda/crédito solidarista.

2026:
- ahorro 3%;
- compras contado o financiadas;
- máximo 6 meses.

Decisión:
- reutilizar lógica de crédito/cuotas;
- agregar ahorro;
- eliminar dependencia con préstamo bancario.

## Banco de los Trabajadores

Legacy:
préstamos de 6, 12 y 18 meses.

2026:
no requerido.

Decisión:
NO implementar.

## Restricción de Q200 por préstamo bancario

Legacy:
si existe préstamo bancario, limita crédito de tienda.

2026:
el préstamo bancario no existe.

Decisión:
eliminar regla.

## Bono 14

Legacy:
implementado.

2026:
no requerido.

Decisión:
fuera de alcance.

## Aguinaldo

Legacy:
implementado.

2026:
no requerido.

Decisión:
fuera de alcance.

## Liquidación laboral

Legacy:
implementada.

2026:
no requerida.

Decisión:
fuera de alcance.

## Multiempresa

Legacy:
sí.

2026:
no solicitado.

Decisión:
no implementar multiempresa.

## Expediente documental

Legacy:
DPI, títulos, antecedentes, fotografía, familia.

2026:
no solicitado.

Decisión:
no implementar salvo requerimiento posterior.

## Ausencias

Legacy:
flujo con jefe, autorización y deducible.

2026:
ausencia a cuenta de salario requiere aprobación del jefe.

Decisión:
reutilización conceptual alta.

## Usuarios / Roles / Permisos

Legacy:
- Usuario
- Role
- Permiso
- RolesPermiso

2026:
requiere interfaz segura y control de acceso.

Decisión:
reutilizar arquitectura RBAC conceptualmente y reimplementar en Prisma/tRPC.

## Períodos

Legacy:
muchas operaciones se obtienen por mes/año de la fecha y existen procesos especiales para prestaciones.

2026:
se creó entidad explícita `PeriodoNomina`.

Decisión:
- período mensual explícito;
- ABIERTO/CERRADO;
- mes+año único;
- sin tipos Bono14/Aguinaldo/Liquidación.

## UI

Legacy:
ASP.NET MVC/Razor.

2026:
React/Next.js.

Decisión:
no reutilizar Views.

## Componentes UI

Decisión vigente:
shadcn/ui es el estándar.

No trasladar estilos legacy.

## Regla final

Cuando exista duda:

```text
¿Legacy dice X?
      ↓
¿REQUIREMENTS_2026 / BUSINESS_RULES dicen lo mismo?
      ↓
Sí → se puede reutilizar.
No → implementar 2026.
```
