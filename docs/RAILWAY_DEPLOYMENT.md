# Preparación y plan de despliegue en Railway

Estado: **preparado en develop; NO desplegado**. No se crearon servicios ni se
publicaron cambios remotos. No hacer push mientras exista un autodeploy conectado
sin revisar primero su configuración. La ejecución del plan espera autorización.

## Arquitectura y archivos

| Servicio | Exposición | Configuración |
| --- | --- | --- |
| MySQL 8.4 | Solo red privada, volumen en /var/lib/mysql | Servicio de base de datos de Railway |
| Web Next.js | HTTPS público | /railway.web.json |
| Trabajador de nómina | Sin dominio ni puerto público, siempre activo | /railway.worker.json |

Los dos servicios de aplicación usan el mismo Dockerfile y commit. Node 22,
Debian slim/OpenSSL, pnpm 11.25.0, lockfile congelado y usuario no privilegiado.
La imagen conserva la CLI de Prisma y tsx para migraciones, seed y trabajador;
por simplicidad no se poda la herramienta de desarrollo de node_modules.
Los archivos .env, Git, tests y documentación quedan fuera del contexto Docker.
Las credenciales se inyectan al ejecutar, nunca durante el build.

El build usa conexiones ficticias no accesibles; no consulta ni migra MySQL.
La descarga de paquetes e instalación de la fuente de Next requieren internet.
El runtime copia los assets de .next y public y escucha 0.0.0.0 en PORT.

- `node scripts/runtime.mjs web`: verifica DATABASE_URL, APP_URL y PORT; inicia Next.
- `node scripts/runtime.mjs worker`: inicia el trabajador sin depender de .env.
- `node scripts/runtime.mjs migrate`: ejecuta únicamente migrate deploy.
- `node scripts/runtime.mjs seed`: bootstrap manual e idempotente; nunca automático.
- `/api/health`: readiness HTTP, consulta SELECT 1; 200 o 503, sin detalles
  internos y sin caché. No reemplaza la supervisión permanente de disponibilidad.

El trabajador conserva la cola MySQL. Al recibir SIGTERM deja de tomar nuevos
trabajos y espera el actual; se conceden 60 segundos antes de terminación forzada.
Después de cinco fallos consecutivos al consultar la cola sale con error para
que el supervisor lo reinicie. Un cálculo marcado FALLIDA requiere revisión o
reintento por el usuario; no se convierte automáticamente en una nómina válida.

## Variables

| Variable | Dónde | Valor |
| --- | --- | --- |
| DATABASE_URL | Web, worker y comandos manuales | Referencia privada al MySQL del mismo entorno |
| APP_URL | Web | Origen HTTPS exacto, sin ruta: https://nomina.example.com |
| NODE_ENV | Ambos | production (ya incluido en la imagen) |
| PORT | Web | Proporcionado por Railway; 3000 por defecto |
| SEED_ADMIN_USERNAME | Solo bootstrap | Usuario administrador elegido |
| SEED_ADMIN_NAME | Solo bootstrap | Nombre del administrador |
| SEED_ADMIN_PASSWORD | Solo bootstrap | Contraseña temporal de 12–128 caracteres |

Si el servicio se llama MySQL y publica MYSQL_URL privada, usar
`DATABASE_URL=${{MySQL.MYSQL_URL}}`. Verificar que resuelva un dominio privado,
no el proxy TCP público. Las referencias dependen del nombre real del servicio.
Si se construye la URL manualmente, codificar usuario/contraseña para URI.

SHADOW_DATABASE_URL se necesita para migrate dev local, **no** para migrate
deploy en Railway. No crear una shadow ni establecerla igual a la principal en
producción. No configurar SKIP_ENV_VALIDATION. No usar variables NEXT_PUBLIC
para secretos. No hace falta inventar un SESSION_SECRET: las sesiones actuales
usan tokens aleatorios almacenados mediante hash en MySQL.

APP_URL es obligatorio para la protección de origen en las mutaciones; un dominio
incorrecto ocasionará 403 en el login. HTTPS permite la cookie Secure.
No establecer TZ=America/Guatemala en MySQL: conservar almacenamiento UTC; la
aplicación y el SP ya resuelven el mes informativo de Guatemala.

## Decisiones confirmadas por el propietario

- Plan: trial de Railway de hasta 30 días. Incluye US$5; finaliza al agotar
  ese saldo o el plazo. Confirmar si la cuenta tiene Full Trial o Limited Trial.
- Dominio: el gratuito asignado por Railway.
- Región: cualquier región disponible; colocar los tres servicios en la misma.
- No se ha autorizado ejecutar el despliegue. Primero se validan contenedores localmente.

El trial limita recursos (la documentación indica 1 GB de RAM y cinco servicios
por proyecto). Tres servicios caben en el límite de cantidad, pero su consumo
puede agotar el crédito antes de 30 días. No usarlo como garantía de continuidad
productiva; exportar backups antes del vencimiento y revisar la retención de
volúmenes. Fuente: https://docs.railway.com/pricing/free-trial.

## Decisiones pendientes antes de ejecutar

1. Proyecto Railway, saldo disponible y alertas de consumo del trial.
2. Elegir un entorno de pruebas separado del productivo. develop será inicialmente
   el origen solicitado; el paso a main continúa bajo control del propietario.
3. Base nueva o traslado de la información local. **Por defecto se preparará una
   base nueva**; no se trasladan empleados, usuarios ni nóminas sin autorización.
4. Registrar el dominio asignado por Railway en APP_URL una vez creado.
5. Identidad del administrador inicial; ingresar su contraseña como secreto,
   no en documentación ni en el repositorio.
6. Retención de backups, responsables de restauración y ventana de mantenimiento.

## Secuencia de despliegue futuro

1. Autorizar el despliegue y comprobar el commit exacto de develop. Antes de
   conectar GitHub, deshabilitar autodeploy o usar servicios vacíos con cambios
   preparados para revisar; no ejecutar un despliegue preliminar accidental.
2. Activar el motor Docker y ejecutar `docker build -t nomina-consulting .`.
   Validar en Linux la instalación de Argon2/Prisma, assets y ejecución de PDF.
   Comprobación Linux aprobada localmente el 14 de octubre de 2026; repetir
   si cambia el código o la imagen base.
3. Crear proyecto/entorno Railway. Crear MySQL y verificar explícitamente
   versión 8.4, volumen persistente, red privada, UTC y backups. No cambiar la
   versión de una base poblada para adaptarla; una versión distinta requiere
   validación de migraciones, índices funcionales, JSON_TABLE y procedimientos.
4. Crear dos servicios desde el repositorio, raíz /, misma rama y commit.
   Asignar Config File Path /railway.web.json y /railway.worker.json respectivamente.
   Mantener el worker detenido hasta completar migraciones y bootstrap. Empezar
   con una réplica de cada aplicación y sin suspensión por inactividad.
5. Configurar variables privadas. Obtener el dominio HTTPS de la web y establecer
   APP_URL antes de probar login. No exponer MySQL ni el worker públicamente.
6. Desplegar web. Su pre-deploy ejecuta migrate deploy una vez como responsable
   único. Necesita permisos DDL y CREATE/ALTER ROUTINE; el worker necesita EXECUTE
   sobre los procedimientos, además de acceso a sus tablas. No migrar desde CMD,
   Docker build, cada réplica ni desde el worker.
7. Si la base es nueva, ejecutar **una sola vez** `node scripts/runtime.mjs seed`
   dentro del servicio con las variables temporales. Por ejemplo, en una sesión
   SSH de Railway asociada al servicio web. `railway run` ejecuta localmente y
   no debe confundirse con un proceso dentro de la red privada.
   El seed crea catálogo, roles, departamentos y administrador; no crea nóminas
   ni empleados de demostración. Retirar SEED_ADMIN_PASSWORD después del bootstrap.
8. Iniciar sesión y cambiar la contraseña temporal. Revisar permisos, cuentas
   contables, parámetros de configuración y fiscalidad del año a utilizar.
   Una base vacía no tendrá un período abierto hasta que un usuario lo cree.
9. Desplegar worker desde el mismo commit. Confirmar su mensaje de inicio, estado
   activo y ausencia de errores de conexión. La web por sí sola no calcula la cola.
10. Probar en el entorno de ensayo: login/logout, cookie Secure, rechazo de origen
    externo, roles, CSV/PDF y una nómina de prueba completa con cierre, avisos y
    restricciones de período. No generar una nómina ficticia en producción.
11. Activar monitoreo, backups y alertas de consumo. El healthcheck de Railway
    protege la entrada del despliegue; agregar vigilancia continua por separado.
12. Habilitar el acceso real solo después de verificar lo anterior. Activar
    autodeploy posteriormente únicamente si el propietario lo decide.

## Datos existentes, mantenimiento y recuperación

Si se autoriza trasladar datos: obtener backup consistente de MySQL con rutinas,
eventos/triggers si existen y _prisma_migrations; validar restauración en entorno
aislado antes del corte. No hacer merge entre una base inicializada y un dump sin
una estrategia de reconciliación. Revisar DEFINER de rutinas al importar.
Nunca versionar dumps ni credenciales.

Antes de actualizaciones con migración: detener trabajador, impedir operaciones
de nómina y comprobar que no haya ejecuciones PENDIENTE/EN_PROCESO. Tomar backup,
desplegar web/migración y luego worker del mismo commit. La política serial evita
reemplazar un SP mientras la versión anterior lo ejecuta. Para cambios aditivos
compatibles se podrá definir un proceso con menor interrupción posteriormente.

Un rollback del código no revierte la base. Restaurar solo tras evaluar los
movimientos posteriores al backup y probar compatibilidad. No usar migrate reset,
db push ni migrate dev en Railway. Los backups deben incluir rutinas y tener una
prueba periódica de restauración. No eliminar volúmenes para resolver fallos.

## Validación de esta preparación

Imagen Linux probada: build, migraciones en MySQL temporal, seed, nómina,
login, PDF, healthcheck y SIGTERM aprobados. No se realizaron migraciones ni
seed sobre la base principal, ni se consumió su cola. Ver docs/CURRENT_STATUS.md
para los resultados locales y las mediciones de memoria.
El docker-compose.yml existente sigue destinado exclusivamente a MySQL local;
no es la definición del despliegue Railway. Railway permite importar algunos
Compose, pero aquí se usan servicios separados y dos archivos explícitos.

## Referencias oficiales

Consultadas el 14 de octubre de 2026:

- [Config as Code](https://docs.railway.com/config-as-code/reference)
- [Dockerfiles](https://docs.railway.com/builds/dockerfiles)
- [Pre-deploy](https://docs.railway.com/deployments/pre-deploy-command)
- [MySQL](https://docs.railway.com/databases/mysql)
- [Healthchecks](https://docs.railway.com/deployments/healthchecks)
