# Configuraciones del sistema

Ruta: `/configuracion`. Requiere SETTINGS.VIEW; editar requiere además SETTINGS.MANAGE.
Se reutilizan los permisos existentes y su asignación administrativa. No se
conceden automáticamente a empleados ni jefes.

Tabla `configuraciones`: id autoincremental, clave única estable, valor,
descripción, versión, fecha y usuario de última actualización. La migración
inserta 21 valores iniciales sin cambiar las reglas monetarias existentes.
No hay creación ni eliminación desde UI: cada parámetro debe tener un consumidor
y validación explícita. La pantalla lista los registros recibidos y usa un modal
genérico por fila, sin formularios específicos por parámetro.

Incluye duración de nuevas sesiones (minutos), intentos/ventana de login,
IGSS laboral/patronal, solidaridad, anticipo, bonificación incentivo,
divisor de hora, factores extra/doble, valor por pieza, tres límites y tasas de
comisión, umbral y dos tasas de ISR. Porcentajes en escala 0–100, máximo dos
decimales; tiempos/divisor/intentos enteros. Rangos se comunican en el modal
y se validan otra vez en servidor. Límites de comisión estrictamente ascendentes.
Una versión obsoleta produce conflicto y no sobrescribe la edición anterior.

El login obtiene los valores de BD sin caché y usa la misma duración para
fechaExpiracion y Max-Age. Las sesiones ya abiertas conservan su vencimiento.
No se trata de un temporizador de inactividad.

La solicitud de nómina captura todos los parámetros en `nomina.reglas`
bajo el mismo bloqueo que las ediciones. El SP calcula con esa captura, incluso
si se cambia la configuración antes de ejecutar el trabajador. La cuota fija del
segundo tramo ISR se deriva de límite × primera tasa. Se usan decimales MySQL.
Las solicitudes antiguas sin captura conservan sus valores originales mediante
compatibilidad del SP. Los históricos y reportes persistidos no se recalculan.

La deducción fiscal anual y referencia normativa ya residen en
`parametro_fiscal_nomina` por ejercicio; se conserva esa fuente y el bloqueo
si falta el año. Calendario comercial 30/360, tratamiento de ausencias y bases
gravables siguen siendo reglas del sistema. Secretos, URL, timeouts técnicos
y frecuencia del trabajador no se exponen como configuraciones.

Despliegue: aplicar migraciones antes de iniciar web/trabajador y generar
Prisma Client. No necesita ejecutar seed para insertar los parámetros.
Pruebas aisladas: `pnpm test:configuraciones --shadow` y
`pnpm test:configuraciones:ui --shadow` (reinician únicamente la shadow).
