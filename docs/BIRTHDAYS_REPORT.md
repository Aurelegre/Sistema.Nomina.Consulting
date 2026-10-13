# Reporte de cumpleañeros (RF-034)

Ruta: /reportes/cumpleaneros, disponible desde Reportes.
Consulta datos actuales; no requiere un período abierto ni una nómina calculada.
No genera registros históricos ni guarda copias del reporte.

## Filtros y columnas
- Mes obligatorio (1 a 12), inicialmente el mes actual de Guatemala.
- Estado: activos por defecto, inactivos o todos.
- Departamento opcional; incluye departamentos inactivos para consultar sus empleados.
- Columnas: código, nombre, departamento actual y cumpleaños en formato dd/mm.
- Orden: día, nombre y código como desempate.
- Total de resultados y mensaje si no hay coincidencias.
- Los nacidos el 29 de febrero aparecen en febrero, sin importar el año actual.
- No se devuelven año de nacimiento, edad, salario ni datos fiscales.
- Los filtros se editan en un modal; no hay polling.

## Exportación
CSV y PDF utilizan la misma consulta, filtros, columnas y orden que la pantalla.
Exportar consulta nuevamente la información vigente: si un empleado cambió desde
la última consulta, el archivo refleja ese cambio. Actualizar recarga la tabla.
CSV usa UTF-8 con BOM y escape de textos; PDF incluye filtros, total y paginación.
No hay generación manual, persistencia, edición ni eliminación de reportes.

## Seguridad
BIRTHDAYS_REPORT.VIEW permite consultar todos los departamentos.
BIRTHDAYS_REPORT.EXPORT exige además VIEW y habilita CSV/PDF.
Backend revalida sesión y permisos. Los dos permisos se asignan inicialmente
solo a ADMINISTRADOR por la migración 20261010100000_reporte_cumpleaneros.
El resto de roles se configura desde la administración de permisos.

## Pruebas
pnpm test:cumpleaneros --shadow
pnpm test:cumpleaneros:ui --shadow
Los runners reinician únicamente la base shadow autorizada. No ejecutarlos
simultáneamente con otras pruebas o migraciones que utilicen esa misma base.
