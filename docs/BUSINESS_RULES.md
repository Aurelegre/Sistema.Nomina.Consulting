# Reglas de Negocio

## RN-001 — Anticipo

El anticipo mensual corresponde al 50% del salario base.

```text
Anticipo = SalarioBase × 0.50
```

Se asume entregado el día 15 a todos los empleados; no se registra el pago ni se
prorratea por baja. El pago final puede resultar negativo.

## RN-002 — Aplicación del anticipo

El anticipo es un pago ya efectuado, no un descuento legal.

```text
SalarioLiquido = TotalIngresos - TotalEgresos
PagoFinal = SalarioLiquido - Anticipo
```

## RN-003 — Valor hora ordinaria

Por consistencia con la implementación anterior, el valor de hora puede calcularse con base mensual de 30 días y 8 horas diarias:

```text
ValorHora = SalarioBase / 240
```

Si el análisis académico define posteriormente otra base, esta regla debe actualizarse.

## RN-004 — Hora extra

```text
HoraExtra = ValorHora × 1.5
```

## RN-005 — Hora doble

```text
HoraDoble = ValorHora × 2
```

Domingos y días festivos se consideran tiempo doble.

## RN-006 — Bonificación Decreto

Monto mensual fijo:

```text
Q250.00
```

## RN-007 — Producción

```text
BonificacionProduccion = Piezas × Q0.01
```

El usuario registra piezas, no el monto final.

## RN-008 — Departamento con comisión

Solo empleados de Mercadeo aplican al esquema de comisiones definido.

## RN-009 — Comisión 0%

Ventas de Q0 a Q100,000:

```text
0%
```

## RN-010 — Comisión 2.5%

Ventas mayores de Q100,000 y hasta Q200,000, incluidos centavos:

```text
2.5%
```

## RN-011 — Comisión 3.5%

Ventas mayores de Q200,000 y hasta Q400,000, incluidos centavos:

```text
3.5%
```

## RN-012 — Comisión 4.5%

Ventas mayores de Q400,000, incluidos centavos:

```text
4.5%
```

## RN-013 — Cálculo de comisión

```text
Comision = TotalVentas × PorcentajeRango
```

## RN-014 — IGSS laboral

```text
IGSSLaboral = BaseSujetaIGSS × 4.83%
```

Se descuenta al empleado.

## RN-015 — IGSS patronal

```text
IGSSPatronal = BaseSujetaIGSS × 10.67%
```

Lo asume Consulting, S.A. y no reduce el pago al empleado.

## RN-016 — ISR

Calcular mediante proyección anual conforme al régimen aplicable a rentas del trabajo en relación de dependencia en Guatemala.

No reutilizar ciegamente umbrales del sistema legacy.
En esta entrega, por decisión del propietario, no se controlan antecedentes
fiscales externos. Se conserva la cuota mensual de referencia sin reducirla por
baja o ausencias. Ver `PAYROLL_GENERATION.md` para proyección y limitaciones.

## RN-017 — Ahorro Solidarista

```text
AhorroSolidarista = SalarioBase × 3%
```
Aplica a todos los empleados incluidos, sin indicador de afiliación ni prorrateo.

## RN-018 — Compra Solidarista

Cada compra es un registro independiente con monto positivo de hasta dos
decimales y detalle obligatorio. Solo se crean para empleados activos y se
asignan al único período abierto. El servidor determina autor y fecha.

## RN-019 — Alcance de compras solidarias

Por decisión del propietario, esta entrega no incluye financiamiento ni cuotas.
La edición modifica únicamente monto y detalle, conserva empleado, período y
autor original, y registra usuario de actualización y versión. Una baja posterior
del empleado no impide corregir o eliminar compras de un período abierto.

## RN-020 — Descuento de compras

El descuento corresponde a la suma de todas las compras del empleado dentro del
período procesado. Cada nueva compra genera un registro nuevo. No se usa la fecha
del sistema para determinar el período operativo. El cierre se coordina con las
escrituras para impedir creaciones, ediciones y eliminaciones posteriores.

## RN-021 — Ausencia

Una ausencia solo afecta salario si fue:

1. aprobada por el jefe correspondiente;
2. marcada a cuenta de salario.

## RN-022 — Período único

Solo puede existir un período por combinación mes + año.

## RN-023 — Estado del período

Estados:

- ABIERTO
- CERRADO

## RN-024 — Período abierto

Permite registrar y procesar información operativa.
Puede haber como máximo un período ABIERTO y puede no existir ninguno. Su mes
y año no tienen que coincidir con los de la fecha del sistema. Cerrar un período
no crea automáticamente el siguiente.
La generación protege sus movimientos mientras se procesa y lo cierra al
confirmar correctamente todos los resultados. Se elimina el cierre manual.

## RN-025 — Período cerrado

No permite modificaciones ordinarias y se conserva para consulta/reportes.

## RN-026 — Anticipo y fin de mes

Ambos pertenecen al mismo período mensual.

## RN-027 — Histórico

Los valores de una nómina cerrada no deben cambiar automáticamente si después se modifican parámetros.

## RN-028 — Autorización

Una acción solo puede ejecutarse si el usuario posee el permiso correspondiente en backend.

## RN-029 — Ciclo de vida de departamentos

El catálogo admite nuevos departamentos con código único e inmutable, nombre
único y cuenta contable obligatoria. Los nuevos registros inician ACTIVO.
Desactivar cambia a INACTIVO sin eliminar datos; ambos estados son consultables.
Crear, editar y desactivar requieren DEPARTMENTS.MANAGE.

## RN-030 — Departamento y empleados

Exigir un jefe activo asignado para crear un departamento e impedir desactivar
departamentos con empleados asignados, incluso inactivos. Estas comprobaciones
se ejecutan en backend y coordinan transaccionalmente las asignaciones y la
desactivación. Implementadas en `feature/employees`; ver `EMPLOYEES.md`.

## RN-031 — Rango mensual de una ausencia

Una solicitud de ausencia no puede abarcar más de un mes calendario.

La fecha de inicio y la fecha de fin deben pertenecer al mismo mes y año.

Ejemplos válidos:

- 2026-09-10 → 2026-09-12
- 2026-10-01 → 2026-10-03

Ejemplo inválido:

- 2026-09-28 → 2026-10-03

Si una ausencia comprende días de dos meses distintos, debe registrarse como dos solicitudes separadas, una por cada mes.

Esta restricción permite que la aplicación posterior de la ausencia en nómina se asocie de forma inequívoca a un único período mensual.

## RN-032 — Solicitante de ausencia

Usuario y empleado tienen una relación uno a uno opcional. Solo usuarios con
empleado activo vinculado y permiso de creación pueden solicitar ausencias para
sí mismos. No se admite creación para terceros, tampoco por administradores.

## RN-033 — Resolución definitiva de ausencia

Solo el jefe vigente del departamento guardado en la solicitud, con el permiso
correspondiente, puede aprobar o rechazar una solicitud PENDIENTE. Puede resolver
su propia solicitud. El departamento original se conserva ante traslados.
El jefe define `aCuentaSalario` tanto al aprobar como al rechazar. Las resoluciones
no se revierten. Esta feature no calcula ni aplica descuentos monetarios.

## RN-034 — Acceso de usuario vinculado a empleado

Además de las validaciones de usuario y rol, un empleado vinculado INACTIVO
impide el login y el uso de sesiones existentes. Su baja revoca las sesiones del
usuario asociado. Un usuario sin empleado conserva las validaciones habituales.

## RN-035 — Generación y salario devengado

Asistencia presumida completa; ingreso y baja inclusivos y ausencias aprobadas
a cuenta de salario determinan los días pagados sobre mes comercial de 30 días.
Fechas de ausencia superpuestas no se descuentan dos veces. Inactivos con
movimientos del período se incluyen usando su fecha de baja. Q250 permanece fijo.
Los resultados se calculan en SP y se guardan junto con los datos utilizados.

## RN-036 — Resultado negativo

El pago final negativo es válido y no bloquea la generación. No se crean cuotas,
saldos ni compensaciones automáticas para períodos siguientes.

## RN-037 — Consulta personal y ejecución

Todo usuario con empleado vinculado consulta únicamente su histórico en Mi Nómina.
La generación requiere PAYROLL.PROCESS; listado PAYROLL.VIEW; detalle
PAYROLL.DETAIL; CSV PAYROLL.EXPORT. La tarea persiste fuera de la sesión del
navegador. Solo la sesión y pestaña solicitante consulta la ejecución; al terminar
o fallar se detiene la consulta y se pide recargar Nómina. Cerrar sesión cancela
el aviso, sin recuperarlo al volver a iniciar sesión. No hay polling general.
Desde la solicitud, el período queda `PROCESANDO` y rechaza nuevos movimientos,
ediciones y eliminaciones. Tampoco se puede abrir otro período. El éxito lo
cierra y un fallo lo devuelve a `ABIERTO`.

## RN-038 — Reporte de póliza contable

Usar importes y asignación departamental/contable guardados en la nómina completada.
Agrupar por cuenta/departamento, sumar por cuenta y conciliar totales sin recalcular.
Generar manualmente después de vista previa, una sola vez por período cerrado.
Conservar autor, fecha e información utilizada; posteriores consultas cargan lo
guardado. Las cuentas nuevas sin movimientos aparecen en cero al preparar el
reporte; un reporte emitido no cambia. Cuentas históricas ausentes mantienen los
importes bajo "Sin cuenta histórica", sin trasladarlos a cuentas actuales.
Negativos en rojo sin lógica adicional. CSV mantiene el signo; PDF reproduce
la vista previa. No hay asientos, pagos ni administración de cuotas.


## RN-039 — Reportes internos de IGSS e ISR

IGSS laboral, IGSS patronal e ISR son tres reportes separados por período cerrado
con nómina completada. Incluyen cuotas cero, código y nombre históricos, resumen
departamental y total. No recalculan impuestos. Se generan manualmente después
de revisar la vista previa y se conservan por nómina y tipo. Las consultas
posteriores cargan el reporte guardado, sin regenerarlo. Departamentos nuevos se
incluyen en cero al preparar reportes todavía no generados. CSV y PDF requieren
permisos específicos del tipo de reporte. Ver TAX_REPORTS.md.
