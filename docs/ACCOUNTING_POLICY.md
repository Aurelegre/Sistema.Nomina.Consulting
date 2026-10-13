# Póliza contable agrupada

Entrega en `feature/reports-nomina`, basada en develop. Rutas: `/reportes` y
`/reportes/poliza`. Solo incluye RF-038; los otros reportes se implementarán
en entregas posteriores.

## Fuente y agrupación

Se selecciona un período CERRADO con nómina COMPLETADA (por defecto el último
por año/mes). Se usan exclusivamente los importes y departamento/cuenta de
`DetalleNomina`; no se recalculan sueldos, impuestos ni descuentos. Empleados
inactivos o trasladados conservan su asignación histórica. Se agrupa por cuenta
y departamento histórico, con resumen por cuenta y totales generales.

Incluye salario devengado, extras, dobles, incentivo, producción, comisiones,
subtotal de ingresos, IGSS patronal/laboral, ISR, solidaridad, compras,
subtotal de descuentos, Anticipo Quincenal y pago final. Las ausencias ya
reducen el salario y no se deducen otra vez. Las ventas y piezas no son importes
a contabilizar. Las clasificaciones son informativas: no hay libro de asientos,
cuadre Debe/Haber, confirmación de pagos ni control de cuotas. Las obligaciones
representan el cierre de nómina, no un saldo actualizado después de pagos.

Los negativos participan con su signo y se muestran en rojo; no bloquean ni
crean deudas, reclasificaciones o compensaciones futuras. CSV conserva el signo
sin colores.

## Cuentas nuevas y cuentas históricas ausentes

Al preparar un reporte todavía no guardado, se añaden con importes cero las
combinaciones actuales de departamento/cuenta que no aparecen en esa nómina.
Se incluyen cuentas de departamentos inactivos. Los departamentos sin cuenta y
sin movimientos no crean filas vacías.

Un cambio de cuenta no reasigna importes antiguos: la cuenta histórica conserva
sus importes y la nueva aparece en cero. Si la nómina guardó cuenta nula, los
importes permanecen bajo "Sin cuenta histórica". Esta decisión sustituye el
bloqueo por cuenta ausente propuesto originalmente en DEPARTMENTS.md, para no
ocultar movimientos ni modificar nóminas antiguas. No se inventan códigos.

## Vista previa y conservación

La consulta no persiste datos. El usuario revisa y confirma Generar reporte.
La tabla `reporte_poliza` guarda la nómina, autor/fecha y documento estructurado
JSON versionado con importes decimales representados como cadenas exactas.
Nomina.periodoId y ReportePoliza.nominaId únicos aseguran un reporte por período.

Si ya existe, se devuelve su contenido guardado. Las nuevas cuentas posteriores
a su generación no modifican el reporte emitido. No hay edición/eliminación ni
regeneración ordinaria. Dos confirmaciones simultáneas devuelven el mismo registro.
Una huella del contenido evita confirmar una vista previa obsoleta; si cambia
la configuración se solicita actualizar y revisar nuevamente. La transacción
comparte el orden de bloqueos organización -> permisos con nómina/departamentos.

Se concilian los importes agrupados con los totales originales antes de guardar.
El reporte nunca modifica nómina, período, compras, empleados ni novedades.

## PDF y CSV

El PDF se genera en Node con `@react-pdf/renderer`, sin navegador externo ni
fuentes remotas. PDF.js presenta el documento con páginas y ampliación, adaptado
al ancho de pantalla; la descarga utiliza la misma plantilla y datos. La generación final
agrega autor, fecha de Guatemala e identificador; la vista se actualiza con ese
documento. Se distribuyen secciones por páginas A4 con importes negativos rojos.

El CSV UTF-8 con BOM incluye las mismas agrupaciones, resumen por cuenta y
totales, identificando cada sección para no confundir subtotales con movimientos.
Textos y comillas se escapan y se neutralizan fórmulas en celdas textuales.
Para preservar ceros iniciales en Excel, importar la columna Cuenta como texto.

Los botones de descarga exigen EXPORT y un reporte guardado. VIEW permite
visualizar el documento completo; como cualquier documento visible, no constituye
protección contra capturas ni contra guardar los datos recibidos por el visor.

## Acceso y operación

- ACCOUNTING_POLICY.VIEW: contexto, vista previa e histórico guardado.
- ACCOUNTING_POLICY.GENERATE: guardar, además de VIEW.
- ACCOUNTING_POLICY.EXPORT: CSV/PDF, además de VIEW.

REPORTS.VIEW habilita el portal pero no la póliza. VIEW de póliza por sí solo
habilita el portal y la ruta, sin exigir permisos de nómina ni acceso individual.
Todos los servicios revalidan sesión/usuario/rol/permisos. La migración agrega
GENERATE y EXPORT únicamente al administrador; el resto se asigna desde Roles.
El seed conserva esta regla sin sobrescribir roles existentes.

Migración: `20261008090000_reporte_poliza`. Ejecutar `pnpm db:generate` y
`pnpm db:migrate` (o deploy en despliegue). No se requiere seed para el administrador
existente. No hay polling, worker nuevo ni SP adicional.

## Validación

`pnpm test:reportes --shadow` y `pnpm test:reportes:ui --shadow` utilizan la base
auxiliar autorizada y nunca la principal. Cubren sumas, cero histórico, negativos,
cuentas compartidas/ausentes, vista obsoleta, concurrencia, conservación, permisos,
CSV/PDF, navegación y dispositivos pequeños. Antes de terminar: lint, typecheck,
build y revisión visual del PDF multipágina.

Validación de esta entrega: 7 comprobaciones backend y 1 escenario integral de
navegador aprobados; typecheck, lint y build correctos (3 advertencias previas de
Ausencias). PDF de tres páginas renderizado e inspeccionado: importes negativos
rojos, cabeceras, márgenes y totales sin recortes. Vista previa adaptable comprobada
en escritorio y móvil. Migración aplicada en principal conservando 5 empleados,
1 nómina y 1 período; no se generaron reportes con datos operativos.
