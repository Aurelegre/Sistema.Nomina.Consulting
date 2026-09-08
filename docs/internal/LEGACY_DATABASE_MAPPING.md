# Legacy Database Mapping

> DOCUMENTO INTERNO.
> No incluir en documentación académica entregable.

## Objetivo

Mapear las entidades del sistema ASP.NET Core 8 anterior hacia el dominio 2026.

## Matriz

| Entidad legacy | Acción | Destino 2026 | Observaciones |
|---|---|---|---|
| Empleado | REUTILIZAR / ADAPTAR | Empleado | Mantener núcleo laboral y salarial. Eliminar datos fuera de alcance si no son necesarios. |
| Departamento | ADAPTAR | Departamento | Los departamentos 2026 son Finanzas, Producción, Logística, Recursos Humanos y Mercadeo. Agregar cuenta contable. |
| Puesto | REUTILIZAR | Puesto | Puede mantenerse como catálogo si aporta al modelo. |
| Usuario | ADAPTAR | Usuario | Implementar con Prisma y sesión nueva. |
| Role | REUTILIZAR CONCEPTO | Rol | RBAC. |
| Permiso | REUTILIZAR CONCEPTO | Permiso | Usar códigos estables. |
| RolesPermiso | REUTILIZAR CONCEPTO | RolPermiso | Relación many-to-many. |
| Ausencia | ADAPTAR | SolicitudAusencia | El flujo de aprobación es reutilizable. |
| Aumento | TRANSFORMAR | NovedadNomina | Puede convertirse en registro genérico de novedades. |
| TipoAumento | TRANSFORMAR | TipoNovedadNomina | Horas, ventas, producción, anticipo, etc. |
| Descuento | ADAPTAR | Novedad/DescuentoNomina | Definir según diseño final de egresos. |
| TipoDescuento | ADAPTAR | TipoDescuentoNomina | Mantener catálogo si simplifica reglas. |
| Nomina | REDISEÑAR | Nomina | Debe reflejar ingresos/egresos 2026 y relacionarse con PeriodoNomina. |
| HistorialSueldo | OPCIONAL | HistorialSalarial | No requerido expresamente, pero puede conservarse si aporta y no aumenta riesgo. |
| Prestamo tipo banco | ELIMINAR | — | Fuera de alcance 2026. |
| Prestamo tipo tienda | ADAPTAR | CompraSolidarista | Reutilizar lógica de cuotas/saldo. |
| TiposPrestamo | REEMPLAZAR | TipoCompra/ModalidadPago | Ya no se necesita distinguir préstamo bancario. |
| HistorialPago | ADAPTAR | PagoCuotaCompra / CuotaCompra | Reutilizable para compras financiadas. |
| Empresa | ELIMINAR | — | El proyecto 2026 no es multiempresa. |
| Familia | ELIMINAR | — | Fuera de alcance. |
| LogError | REUTILIZAR CONCEPTO | LogError | Recomendado. |
| LogTransacciones | REUTILIZAR CONCEPTO | AuditLog | Recomendado para auditoría. |

## Nuevas entidades requeridas

### PeriodoNomina
Ya implementada.

Campos actuales:

- id
- mes
- anio
- estado
- fechaCreacion
- fechaCierre

### CuentaContable / relación contable
Debe permitir asociar cada departamento a una cuenta contable.

Puede modelarse como:
- campo en Departamento; o
- catálogo CuentaContable + relación.

### AhorroSolidarista
Debe registrar/aplicar el ahorro del 3%.

Según el diseño final puede ser:
- resultado dentro de Nomina; y/o
- movimiento/histórico separado.

### NovedadNomina
Recomendado para agrupar:

- horas extra;
- horas dobles;
- producción;
- ventas;
- anticipo;
- otros movimientos controlados.

### CompraSolidarista
Debe representar:

- empleado;
- fecha;
- monto;
- forma de pago;
- número de cuotas;
- saldo;
- estado.

### CuotaCompra
Debe permitir determinar qué cuota corresponde descontar en cada período.

## Nomina 2026 — rediseño sugerido

Campos conceptuales:

- id
- empleadoId
- periodoId
- salarioBase
- diasLaborados
- horasExtras
- montoHorasExtras
- horasDobles
- montoHorasDobles
- bonificacionDecreto
- bonificacionProduccion
- comisiones
- otrosIngresos
- totalIngresos
- igssLaboral
- igssPatronal
- isr
- ahorroSolidarista
- descuentoCompras
- descuentoAusencias
- otrosDescuentos
- totalEgresos
- salarioLiquido
- anticipo
- pagoFinal
- fechaProcesamiento

El diseño final puede normalizar estos conceptos en detalles de nómina si conviene.

## Regla para Codex

No crear automáticamente todos los modelos de esta lista.

Antes de implementar una feature:

1. analizar el requerimiento;
2. revisar si el modelo legacy ayuda;
3. diseñar el modelo mínimo 2026;
4. crear migración Prisma;
5. evitar arrastrar columnas legacy fuera de alcance.
