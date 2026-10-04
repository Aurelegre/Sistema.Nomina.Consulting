# Generación de nómina

Rama: `feature/generacion-nomina`, basada en `origin/develop`.

## Operación

- `/nomina`: generación, últimas ejecuciones, histórico por rango mensual,
  detalle de empleados y CSV completo.
- `/mi-nomina`: histórico exclusivamente del empleado vinculado a la sesión.
  Disponible a todo usuario vinculado; no necesita permisos administrativos.
  Se conserva el bloqueo de sesiones/login de empleados inactivos.
- El único período ABIERTO determina los movimientos, independientemente de
  la fecha actual. Al solicitar la generación pasa al estado `PROCESANDO`.
- Se captura salario, datos laborales, departamento/cuenta y movimientos en
  una transacción coordinada con empleados, compras, novedades y ausencias.
  Los cambios posteriores de salario o departamento no alteran esta captura.
- `sp_generar_nomina` calcula y persiste todos los importes. Confirma detalles,
  totales, aplicación de ausencias y cierre dentro de una sola transacción.
- No hay procedimiento tRPC ni botón de cierre manual. La migración retira
  `PAYROLL.CLOSE` y `PAYROLL_PERIODS.CLOSE` del catálogo y sus asignaciones.
- No se genera automáticamente el siguiente período ni se reabre una nómina.

## Reglas acordadas con el propietario

Se presume asistencia completa y anticipo entregado a todos. No se implementa
registro de anticipos pagados, afiliación solidarista ni carga fiscal previa.

- Activos cuya relación laboral cruza el período; inactivos con novedades,
  compras o ausencias aprobadas del período. Un inactivo debe tener fecha de baja.
- Base comercial 30/360: el día 31 tiene peso cero; el último día de febrero
  completa los 30 días. Ingreso y salida son inclusivos. Se aplica la misma
  ponderación a ausencias, sin duplicar fechas superpuestas. Mes completo sin
  ausencias = 30 días; mes completamente ausente = 0 días trabajados.
- Salario devengado = salario base / 30 × días trabajados. La reducción por
  ausencias se informa, pero no se vuelve a descontar en total de egresos.
- Horas extras: salario base / 240 × 1.5. Dobles: salario base / 240 × 2.
- Producción: piezas × Q0.01. Se conservan movimientos de departamentos de
  origen válidos aunque el empleado haya sido trasladado.
- Comisión sobre el total: hasta 100000 = 0%; (100000,200000] = 2.5%;
  (200000,400000] = 3.5%; más de 400000 = 4.5%.
- Bonificación incentivo fija Q250 mensuales, sin proporcionalidad adicional.
- IGSS laboral 4.83% y patronal 10.67% del salario devengado y adicionales
  salariales. Q250 queda excluido de IGSS; producción se considera salarial.
- Ahorro solidarista 3% del salario base para todos, sin prorrateo por baja.
- Compras: suma íntegra de registros del período, sin cuotas ni arrastre.
- Anticipo: 50% del salario base sin prorrateo, asumido como ya entregado.
- Líquido = ingresos - egresos; pago final = líquido - anticipo. Se permite
  resultado negativo; no crea deuda ni compensación automática futura.
- DECIMAL en MySQL; cada concepto monetario se redondea a dos decimales.
  Los totales de cabecera suman los importes guardados por empleado.

## Alcance fiscal

ISR usa la cuota de referencia mensual anualizada **antes** de reducir salario
por baja o ausencias, conforme a la decisión del propietario. Incluye Q250 e
ingresos adicionales; resta IGSS de referencia anualizado y la deducción anual.
Renta imponible no negativa: 5% hasta Q300000; Q15000 + 7% del excedente.
La cuota mensual resulta de dividir el impuesto proyectado entre 12.

`parametro_fiscal_nomina` conserva deducción y fuente por año. La migración
incluye 2025 (Q48000) y 2026 (Q51024, incluyendo Q3024 extraordinarios).
Un año sin parámetros bloquea la solicitud con mensaje explícito; no se
reutilizan automáticamente umbrales de otro ejercicio. Los parámetros usados
se copian en `Nomina.reglas` y permanecen en el histórico.

Esta implementación responde al alcance simplificado autorizado: no incorpora
antecedentes de otros patronos, ajustes anuales por retenciones anteriores,
deducciones documentales ni liquidación fiscal por terminación. Tampoco calcula
ajustes de contribución mínima patronal por actividad/circunscripción; usa la
cuota patronal de RN-015. No debe presentarse como conciliación fiscal integral.

Fuentes consultadas:

- [IGSS: tasas y contribución mínima](https://www.igssgt.org/noticias/2022/10/03/el-igss-fija-cuota-minima-de-contribuciones-a-la-seguridad-social/).
- [IGSS: tratamiento de bonificaciones](https://www.igssgt.org/noticias/2018/11/23/igss-este-es-el-nuevo-reglamento-sobre-recaudacion-de-contribuciones-al-regimen-de-seguridad-social/).
- [Ley de Actualización Tributaria, arts. 68–79](https://www.tse.org.gt/images/UECFFPP/leyes/decreto_10-2012_Ley_actualizacion_tributaria.pdf).
- [Congreso: Decreto 13-2026](https://www.congreso.gob.gt/detalle_pdf/decretos/13702).
- [Congreso: deducción extraordinaria 2026](https://www.congreso.gob.gt/noticias_congreso/16364/2026/).

## Procedimientos y concurrencia

`sp_obtener_mes_actual(OUT nombre)` obtiene el mes de UTC menos seis horas
(Guatemala). Su resultado se guarda como metadato de generación. No interviene
en fórmulas, selección de movimientos o selección de parámetros fiscales.
Por instrucción actual se usa SP, sustituyendo la función inicialmente prevista
en RF-040. No requiere habilitar privilegios globales de creación de funciones.

El SP principal administra su transacción y debe llamarse fuera de una
transacción interactiva de Prisma. Usa un bloqueo MySQL por identificador de
nómina: dos trabajadores no pueden calcular el mismo trabajo simultáneamente.
Una llamada a una nómina completada no produce cambios. La restricción única
de período evita duplicados desde solicitudes concurrentes.

La cola reside en `Nomina`: PENDIENTE, EN_PROCESO, COMPLETADA, FALLIDA. El proceso
trabajador recupera trabajos EN_PROCESO cuyo ejecutor haya perdido la conexión.
Los errores SQL revierten importes/cierre, marcan FALLIDA y liberan el período.
Al reintentar se autorizan y capturan nuevamente los datos. El estado visible,
las fechas, solicitante e intentos permiten seguir la ejecución.

Solo la pestaña y sesión que inicia la generación consulta esa ejecución cada
tres segundos. Al finalizar detiene el seguimiento y pide recargar Nómina para
ver los resultados, sin actualizar automáticamente el listado. Al cerrar sesión
se cancela el seguimiento; un nuevo inicio de sesión no recupera avisos anteriores.
No existen consultas periódicas de listados, contexto ni notificaciones generales.
Los movimientos rechazan períodos `PROCESANDO` o `CERRADO`. Solo puede existir
un período `ABIERTO` o `PROCESANDO` a la vez. Un fallo devuelve el período a
`ABIERTO`; el cálculo exitoso lo deja `CERRADO`.

## Permisos

| Código | Acción |
|---|---|
| PAYROLL.PROCESS | Generar, reintentar y consultar ejecuciones propias |
| PAYROLL.VIEW | Listado administrativo y totales |
| PAYROLL.DETAIL | Desglose administrativo por empleado |
| PAYROLL.EXPORT | CSV completo de nóminas completadas |

El servicio revalida sesión, usuario, rol y permisos. El acceso personal deriva
el empleado de la sesión; no recibe identificadores de empleado del cliente y
no devuelve totales globales. Un usuario con solo PROCESS puede solicitar y
seguir su trabajo sin obtener detalle salarial de otros empleados.

## Ejecución local y despliegue

```sh
pnpm db:generate
pnpm db:migrate
pnpm dev
```

`pnpm dev` inicia Next y el trabajador. En producción ejecutar dos procesos
supervisados con las mismas variables de conexión:

```sh
pnpm start
pnpm worker:nomina
```

No basta con mantener únicamente Next: una tarea pendiente necesita un trabajador.
Los reintentos no dependen del navegador ni de callbacks en memoria del servidor.
No ejecutar Prisma Migrate mientras pruebas estén usando la shadow como base.

## Pruebas

```sh
pnpm lint
pnpm typecheck
pnpm test:nomina --shadow
pnpm test:nomina:ui --shadow
```

Los runners usan una base temporal por defecto. `--shadow` reinicia únicamente
la base auxiliar y exige que su nombre difiera del de la principal. Este modo
fue autorizado expresamente por el propietario. Los fixtures nunca deben
ejecutarse directamente sobre la base de trabajo.

## Validación realizada

- `pnpm lint`: correcto, con tres advertencias preexistentes en Ausencias.
- `pnpm typecheck` y `pnpm build`: correctos. El build necesita acceso a Google
  Fonts para la fuente Geist ya utilizada por el proyecto.
- Backend: 7 comprobaciones de nómina y 16 de compras/novedades aprobadas.
- Navegador: 3 escenarios aprobados (nómina, compras y períodos), incluyendo
  CSV, aviso al cambiar de pantalla, Mi Nómina, filtros y presentación móvil.
- `pnpm db:generate` y `pnpm db:migrate`: ejecutados; migración aplicada a la
  base principal conservando cinco empleados, una ausencia y el período 9/2026
  abierto. No se generaron nóminas con datos operativos.
