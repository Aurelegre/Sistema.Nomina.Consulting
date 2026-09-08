# Legacy System Reference

> DOCUMENTO INTERNO DE DESARROLLO.
> No forma parte de la documentación académica entregable del proyecto 2026.

## Repositorio

Sistema anterior:

`https://github.com/Aurelegre/Sistema.Gestion.Nomina-`

Rama de referencia:

`develop`

## Propósito

El sistema anterior sirve como referencia técnica para acelerar el desarrollo del proyecto 2026.

Puede consultarse para:

- entender modelos de datos ya probados;
- revisar relaciones;
- reutilizar conceptos;
- analizar reglas de negocio anteriores;
- reutilizar consultas y cálculos cuando coincidan;
- identificar funcionalidades que deben eliminarse;
- migrar conocimiento de dominio.

No debe copiarse automáticamente.

## Tecnología legacy

- ASP.NET Core 8 MVC
- C#
- Entity Framework Core 8
- SQL Server
- autenticación basada en cookies
- BCrypt
- AutoMapper
- ClosedXML
- QuestPDF

## Estructura observada

```text
Sistema.Gestion.Nómina/
  Controllers/
  DTOs/
  Entitys/
  Helpers/
  Models/
  Services/
  Views/
  wwwroot/
  Program.cs
```

Además existe un proyecto relacionado con préstamos.

## Entidades observadas

- Empleado
- Departamento
- Puesto
- Usuario
- Role
- Permiso
- RolesPermiso
- Ausencia
- Aumento
- TipoAumento
- Descuento
- TipoDescuento
- Nomina
- HistorialSueldo
- Prestamo
- TiposPrestamo
- HistorialPago
- Empresa
- Familia
- LogError
- LogTransacciones

## Servicios/reglas observadas

El sistema anterior incluye lógica equivalente a:

- cálculo de anticipo;
- comisión por ventas;
- bonificación por producción;
- horas extras;
- horas dobles/festivos;
- cuota laboral IGSS;
- cuota patronal IGSS;
- ISR;
- ausencias;
- cuotas de préstamos/créditos;
- Bono 14;
- Aguinaldo.

## Tabla genérica de novedades

El sistema legacy utiliza conceptos como `Aumento` y `TipoAumento` para registrar diferentes novedades.

Usos observados conceptualmente:

- horas extra;
- horas dobles;
- anticipo;
- ventas;
- producción.

Esta estrategia puede inspirar un modelo `NovedadNomina` en el proyecto 2026.

## Seguridad legacy

Ya existen los conceptos:

- Usuario
- Role
- Permiso
- RolesPermiso

Se reutiliza el diseño conceptual RBAC, no necesariamente el esquema exacto.

El proyecto 2026 deberá implementarlo con Prisma/tRPC.

## Ausencias legacy

El modelo anterior contempla:

- empleado;
- jefe;
- fechas;
- autorización;
- deducible/no deducible;
- detalle.

El flujo coincide en gran medida con el proyecto 2026 y puede reutilizarse conceptualmente.

## Tienda/Crédito legacy

La entidad `Prestamo` representa más de un tipo de financiamiento.

En el sistema anterior:

- un tipo corresponde al Banco de los Trabajadores;
- otro tipo corresponde a crédito de tienda.

Para 2026 solo interesa reutilizar la parte equivalente a compras financiadas de Asociación Solidarista.

## Advertencia

Antes de reutilizar cualquier regla legacy:

1. revisar `REQUIREMENTS_2026.md`;
2. revisar `BUSINESS_RULES.md`;
3. revisar `MIGRATION_DECISIONS.md`.

El sistema legacy nunca tiene prioridad sobre el proyecto 2026.
