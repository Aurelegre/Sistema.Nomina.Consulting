# Reportes internos de IGSS e ISR

## Alcance
Tres reportes independientes: IGSS laboral, IGSS patronal e ISR. Se consultan en
/reportes/igss-laboral, /reportes/igss-patronal y /reportes/isr.
Son consultas internas; no constituyen declaraciones ni archivos oficiales.

## Flujo
1. Seleccionar un período cerrado con nómina completada (por defecto, el más reciente).
2. Si existe un reporte del tipo seleccionado, cargar su información conservada.
3. Si no existe, mostrar una vista previa sin persistirla.
4. Confirmar manualmente la generación. Se verifica que la información no haya
   cambiado desde la vista previa; si cambió, se solicita actualizarla.
5. Conservar una fila ReporteTributario por nómina y tipo, con autor, fecha y
   datos JSON versionados. La restricción única y la transacción evitan duplicados.
6. Exportar el reporte guardado a CSV o PDF con autorización específica.
   La vista previa utiliza el mismo PDF que se exporta. No hay polling.

## Datos
Los importes proceden exclusivamente de DetalleNomina; no se ejecuta el SP de
cálculo ni se recalculan cuotas. Código, nombre y departamento son los históricos.
Incluye empleados con cuota cero y empleados dados de baja presentes en esa nómina.

- IGSS laboral: días, base IGSS y cuota laboral aplicada.
- IGSS patronal: días, base IGSS y aporte patronal aplicado.
- ISR: días, ingresos del período, renta imponible anual proyectada conservada
  y retención mensual aplicada. La renta anual no se suma como retención mensual.
- Resumen por departamento y total general con aritmética decimal.
- Los departamentos del catálogo ausentes en la nómina se agregan en cero al
  preparar un reporte nuevo. Un reporte ya guardado permanece inmutable:
  departamentos agregados después de su generación no alteran ese documento.
- Los valores negativos conservan su signo y aparecen en rojo en PDF.
- No se exponen NIT ni números de afiliación.

## Autorización
Cada prefijo tiene VIEW, GENERATE y EXPORT:
IGSS_LABOR_REPORT, IGSS_EMPLOYER_REPORT e ISR_REPORT.
GENERATE y EXPORT requieren además VIEW del mismo tipo.
La autorización se valida en los servicios, incluidos los llamados desde tRPC.
Tener permisos para un tipo no otorga acceso a los demás.
La migración asigna los nueve permisos a ADMINISTRADOR; los otros roles se
configuran explícitamente desde la administración de permisos.

## Persistencia
Migración: 20261010090000_reportes_igss_isr.
Agrega reporte_tributario y nueve permisos, sin modificar importes de nómina.
No existen acciones de edición, eliminación o regeneración de estos reportes.

## Pruebas
- Servicios y MySQL: pnpm test:tributarios --shadow
- Navegador: pnpm test:tributarios:ui --shadow
Estos runners reinician exclusivamente la shadow explícitamente seleccionada.
No ejecutar simultáneamente dos runners sobre la misma base.
