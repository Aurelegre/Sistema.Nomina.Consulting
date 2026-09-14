# Administración de usuarios, roles y permisos

## Pantallas

- `/usuarios`: búsqueda, filtros por estado/rol, paginación, creación, edición,
  asignación de rol, activación/desactivación y restablecimiento de contraseña.
- `/roles`: búsqueda, paginación, creación, edición, estado y asignación de permisos
  agrupados por módulo, con resumen y confirmación de cambios.
- `/permisos`: catálogo consultable y roles asociados.

Cada ruta comprueba su propio permiso en servidor. El sidebar y la navegación
compartida muestran las secciones permitidas. Los procedimientos tRPC verifican
sesión, cambio de contraseña pendiente y permiso. Las escrituras vuelven a
consultar la sesión y los permisos dentro de la transacción.

## Reglas de administración

- Un usuario tiene un rol; el rol tiene múltiples permisos.
- Crear usuarios requiere USERS.CREATE y USERS.ASSIGN_ROLE.
- Editar nombre/username requiere USERS.UPDATE. El formulario general no acepta
  rol, estado, hash ni el indicador debeCambiarPassword.
- Asignar roles requiere USERS.ASSIGN_ROLE y un rol activo.
- Cambiar estado requiere USERS.DISABLE. No se permite activar una cuenta cuyo
  rol esté inactivo.
- Restablecer contraseña requiere USERS.RESET_PASSWORD.
- Los cambios de roles/permisos requieren ROLES.MANAGE.
- Los gestores delegados solo pueden administrar cuentas y roles cuyos permisos
  estén contenidos en los suyos. Esto también se aplica a restablecimientos.
- Solo administradores pueden administrar cuentas administradoras o asignar
  ADMINISTRADOR. Ningún usuario puede cambiar su propio rol ni estado.
- ADMINISTRADOR es un rol protegido: código, estado, metadatos y permisos no se
  modifican desde el módulo. El seed mantiene todas sus asignaciones.
- Debe conservarse al menos un administrador activo.
- Un rol no puede desactivarse mientras tenga usuarios activos.
- Un gestor delegado no puede modificar su propio rol.
- No se eliminan usuarios ni roles desde la interfaz.

## Contraseñas y sesiones

Al crear o restablecer una cuenta se genera una contraseña temporal aleatoria de
24 caracteres. Se guarda únicamente el hash Argon2id y debeCambiarPassword=true.
La respuesta se presenta una sola vez en un diálogo y no se conserva en la caché
de mutaciones de React Query. Se debe copiar antes de cerrar; si se pierde,
utilizar nuevamente el restablecimiento.

El restablecimiento revoca todas las sesiones y limpia los intentos fallidos.
El usuario debe cambiar la contraseña temporal en su siguiente acceso. Si el
administrador restablece su propia contraseña, el diálogo permite copiarla antes
de volver al login. No se vuelve a ejecutar el seed para recuperar contraseñas.

Desactivar usuarios, cambiar username o asignar rol revoca las sesiones de la
cuenta. Cambiar permisos o estado del rol revoca las sesiones de sus usuarios.
Editar solamente el nombre no cierra la sesión.

## Concurrencia

Usuario.version y Rol.version detectan formularios abiertos sobre datos antiguos.
Las escrituras de administración bloquean primero la fila del rol ADMINISTRADOR
con SELECT FOR UPDATE, dentro de una transacción READ COMMITTED. Esto serializa
las operaciones de seguridad, incluidas la comprobación del administrador que
actúa y la conservación del último administrador. Un contexto tRPC obtenido antes
de revocar una sesión no permite ejecutar nuevas escrituras con ella.

El cambio de contraseña inicial incrementa la versión del usuario. Cambiar
permisos/estado del rol incrementa también las versiones de sus usuarios. Los
conflictos requieren recargar la lista y abrir nuevamente el formulario.

## Seed y alcance departamental

El catálogo permanece en src/shared/permisos.ts. Las plantillas están en
prisma/roles-iniciales.ts. NOMINA_RRHH, JEFE_DEPARTAMENTO y FINANZAS_CONSULTA se
crean con permisos iniciales una sola vez. Repetir el seed conserva sus cambios,
estados y asignaciones, así como las contraseñas de usuarios existentes.
Si se cambia el username de la cuenta inicial, actualizar SEED_ADMIN_USERNAME
en el entorno antes de volver a ejecutar el seed.

El rol JEFE_DEPARTAMENTO queda preparado conceptualmente. Los futuros módulos de
empleados y ausencias deberán exigir la relación departamental antes de mostrar
datos o autorizar aprobaciones. FINANZAS_CONSULTA requiere restringir su consulta
de nóminas a las cerradas cuando se implemente ese módulo.

## Validación y despliegue

Aplicar `pnpm db:deploy` y `pnpm db:seed` después de generar el cliente Prisma.
En desarrollo usar `pnpm db:migrate`. La migración agrega columnas con valor
inicial 1, sin modificar usuarios, claves o asignaciones existentes.

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:auth`
- `pnpm test:access`
- `pnpm test:auth:ui`

Las pruebas crean cuentas/roles con identificadores aleatorios y los eliminan
al finalizar. Nunca deben alterar la cuenta administradora del propietario.
Las pruebas de navegador usan Edge sin ventana y el puerto 3100.
