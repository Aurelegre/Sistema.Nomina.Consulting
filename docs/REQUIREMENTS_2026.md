# Requerimientos Funcionales 2026

## Regla de alcance

Este documento es la fuente de verdad funcional del proyecto 2026.

La existencia de funcionalidad en el sistema legacy NO implica que deba implementarse en el proyecto actual.

## Seguridad y usuarios

### RF-001 — Iniciar sesión
El sistema deberá permitir que usuarios registrados ingresen mediante credenciales válidas.

### RF-002 — Administrar usuarios
El sistema deberá permitir registrar, consultar, modificar, activar y desactivar usuarios.

### RF-003 — Administrar roles y permisos
El sistema deberá permitir administrar roles y permisos y asignar permisos a roles.

## Empleados y organización

### RF-004 — Administrar empleados
Registrar, consultar y modificar la información necesaria para nómina.

### RF-005 — Administrar departamentos
Consultar, crear, modificar y desactivar departamentos. El catálogo inicial
incluye Finanzas, Producción, Logística, Recursos Humanos y Mercadeo y permite
agregar más departamentos. Mostrar el estado ACTIVO/INACTIVO en administración.
La desactivación conserva el registro.

La creación de un departamento exige un jefe asignado y la desactivación se
impide si tiene empleados asignados. Ambas validaciones, aplazadas originalmente
por instrucción del propietario, se incorporan en `feature/employees`.

### RF-006 — Asignar cuenta contable a departamento
Cada departamento debe estar asociado a una cuenta contable.

### RF-007 — Administrar salario base
Mantener el salario base vigente de cada empleado.

## Períodos

### RF-008 — Administrar períodos de nómina
Crear y consultar períodos mensuales identificados por mes y año.

### RF-009 — Controlar estado del período
Estados:

- ABIERTO
- CERRADO

Un período cerrado no admite operaciones ordinarias que alteren su información.
Solo puede existir un período ABIERTO a la vez, independientemente de la fecha
del sistema. Puede no existir ninguno. Debe cerrarse el abierto antes de crear otro.

## Días laborados y ausencias

### RF-010 — Registrar días laborados
Mantener días laborados calculados por empleado y período. Se presume asistencia
completa, delimitada por ingreso/baja y descontando ausencias autorizadas a cuenta
de salario. Ver `PAYROLL_GENERATION.md` para base comercial de 30 días.

### RF-011 — Registrar solicitud de ausencia
Registrar solicitudes de ausencia asociadas a empleado, fechas, motivo y estado.

### RF-012 — Aprobar o rechazar ausencia
El jefe del departamento correspondiente podrá aprobar o rechazar.

### RF-013 — Calcular descuento por ausencia
Solo ausencias aprobadas y marcadas a cuenta de salario podrán generar descuento.

## Horas adicionales

### RF-014 — Registrar horas extras y dobles
Registrar horas extraordinarias por empleado y período.

### RF-015 — Calcular pago de horas adicionales
Calcular automáticamente horas extras y dobles según reglas de negocio.

## Bonificaciones

### RF-016 — Aplicar Bonificación Decreto
Aplicar Q250.00 mensuales cuando corresponda.

### RF-017 — Registrar producción y calcular bonificación
Registrar cantidad de piezas y calcular automáticamente la bonificación.

## Comisiones

### RF-018 — Registrar ventas de Mercadeo
Registrar total de ventas por empleado y período.

### RF-019 — Calcular comisión sobre ventas
Aplicar automáticamente el porcentaje correspondiente según rango.

## IGSS

### RF-020 — Calcular cuota laboral IGSS
Calcular y descontar la cuota laboral.

### RF-021 — Calcular cuota patronal IGSS
Calcular la cuota asumida por Consulting, S.A.

## ISR

### RF-022 — Calcular ISR proyectado
Calcular ISR mediante proyección anual conforme a rentas del trabajo en relación de dependencia en Guatemala.
Alcance acordado: cuota mensual de referencia sin recalcular por baja; sin carga
de antecedentes fiscales externos. Conservar parámetros por ejercicio y advertir
si faltan. Detalle y límites en `PAYROLL_GENERATION.md`.

### RF-023 — Registrar retención ISR
Aplicar el resultado como egreso del empleado.

## Asociación Solidarista

### RF-024 — Calcular ahorro solidarista
Aplicar ahorro mensual del 3% del salario base.

### RF-025 — Registrar compra solidarista
Registrar compras independientes por empleado activo, con monto y detalle
obligatorios, autor y fecha de registro. Se asignan al único período abierto.
Crear desde `/empleados` y administrar desde `/asociacion/compras`, con permisos
independientes para consultar, crear, editar y eliminar. El listado permite
filtrar períodos anteriores y por defecto utiliza el abierto.

### RF-026 — Administrar financiamiento de compra
Excluido de esta entrega por decisión del propietario: no implementar cuotas,
plazos, financiamiento, saldos ni control de pagos de compras solidarias.

### RF-027 — Descontar compras del período
Sumar íntegramente las compras del empleado en el período procesado para su
deducción en nómina. Los períodos cerrados no permiten crear, editar ni eliminar
compras. La integración monetaria se realizará con el procesador de nómina.

## Anticipo

### RF-028 — Calcular anticipo
Calcular el 50% del salario base el día 15.

### RF-029 — Aplicar anticipo al pago final
Deducir el anticipo después de calcular el salario líquido.

## Procesamiento

### RF-030 — Calcular nómina de fin de mes
Procesar ingresos, egresos, salario líquido, anticipo y pago final.

### RF-031 — Visualizar detalle de cálculo
Mostrar la información necesaria para validar el cálculo.

### RF-032 — Cerrar nómina/período
Proteger la información histórica una vez cerrado.
El cierre ocurre automáticamente y de forma atómica al completar el cálculo.
No existe cierre manual ni reapertura ordinaria. Si falla, el período sigue abierto.

## Histórico

### RF-033 — Consultar histórico de nóminas
Consultar nóminas anteriores conservando los valores realmente aplicados.
Cada usuario con empleado vinculado puede consultar su propio histórico en
`/mi-nomina`, con filtros desde/hasta por período. Los inactivos conservan su
restricción de acceso. Exportar CSV completo requiere PAYROLL.EXPORT.

## Consultas y reportes

### RF-034 — Cumpleañeros por mes
Ingresar mes y mostrar empleados que cumplen años.

### RF-035 — Descuentos IGSS por período
Generar listado por período.

### RF-036 — Aporte patronal IGSS por período
Generar consulta del aporte patronal.

### RF-037 — Descuentos ISR por período
Generar listado por período.

### RF-038 — Póliza contable
Generar información agrupada por cuenta contable/departamento.

### RF-039 — Libro de Salarios
Mostrar como mínimo:
- Departamento
- Empleado
- Sueldo Base
- Días Laborados
- Ingresos
- Egresos

## Requerimientos específicos de base de datos

### RF-040 — Procedimiento nombre del mes
Por instrucción del propietario, crear un SP MySQL que obtenga el nombre del
mes actual de Guatemala. Se usa únicamente como metadato de generación; nunca
determina el período ni interviene en cálculos.

### RF-041 — Procedimiento de cálculo de nómina
Crear un stored procedure MySQL que realice el cálculo y persista la nómina de
fin de mes. La ejecución será asíncrona, persistente y notificará al solicitante.

## Fuera de alcance 2026

No implementar salvo requerimiento explícito posterior:

- préstamos del Banco de los Trabajadores;
- multiempresa;
- Bono 14;
- Aguinaldo;
- liquidación laboral;
- expediente documental PDF de contratación;
- fotografía del empleado como requisito;
- familiares del empleado como requisito;
- restricción de crédito por préstamo bancario.
