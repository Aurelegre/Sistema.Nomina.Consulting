# Project Context — Sistema.Nomina.Consulting

## Proyecto

Proyecto Final 2026 — Análisis y Desarrollo.

Empresa: Consulting, S.A.

Objetivo: desarrollar un sistema web para automatizar la gestión y procesamiento de la nómina mensual de la empresa.

## Alcance funcional 2026

El sistema debe manejar:

- empleados;
- departamentos;
- salarios base;
- períodos mensuales de nómina;
- días laborados;
- solicitudes de ausencia;
- horas extras;
- horas dobles;
- Bonificación Decreto;
- bonificación por producción;
- comisiones de Mercadeo;
- anticipo mensual;
- IGSS laboral;
- IGSS patronal;
- ISR;
- ahorro de Asociación Solidarista;
- compras de Asociación Solidarista;
- cuotas de compras financiadas;
- procesamiento de nómina;
- histórico;
- póliza contable;
- Libro de Salarios;
- reportes de IGSS;
- reportes de ISR;
- cumpleañeros;
- función MySQL para nombre de mes;
- stored procedure MySQL para cálculo de nómina de fin de mes;
- usuarios, autenticación, roles y permisos.

## Departamentos 2026

- Finanzas
- Producción
- Logística
- Recursos Humanos
- Mercadeo

Cada departamento tendrá asociada una cuenta contable para la generación de la póliza.

## Tecnología

### Aplicación

- Next.js + React
- TypeScript
- tRPC
- TanStack React Query
- Prisma
- MySQL

### UI

- shadcn/ui como biblioteca principal de componentes.
- Tailwind CSS queda como sistema subyacente y se usa manualmente principalmente para layout/composición.
- Layout administrativo con sidebar izquierdo colapsable.

## Períodos

Un período representa un mes y año de nómina ordinaria.

Ejemplo:

```text
Septiembre 2026
```

Estados:

- ABIERTO
- CERRADO

El anticipo del día 15 y la nómina de fin de mes pertenecen al mismo período.

No existen en este proyecto períodos especiales de Bono 14, Aguinaldo o Liquidación.

## Seguridad

El sistema deberá contar con:

- login;
- usuarios;
- roles;
- permisos;
- permisos asignados por rol;
- procedimientos protegidos en backend;
- acciones visibles en UI según permisos;
- validación backend independientemente de la UI.

## Sistema anterior

Existe un sistema de nómina previo desarrollado en ASP.NET Core 8 y Entity Framework Core sobre SQL Server.

Se usa únicamente como referencia interna para:

- estructura de datos;
- relaciones;
- reglas reutilizables;
- servicios;
- flujos;
- reportes;
- lógica ya comprobada.

Repositorio:

`https://github.com/Aurelegre/Sistema.Gestion.Nomina-`

Rama de referencia:

`develop`

El sistema anterior NO define el alcance del proyecto 2026.

Leer `docs/internal/` para las decisiones de reutilización.
