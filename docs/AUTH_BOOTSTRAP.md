# Acceso inicial y despliegue

Esta feature agrega el catálogo de permisos, el rol ADMINISTRADOR, el primer
usuario, sesiones y cambio obligatorio de contraseña temporal. La administración
visual de usuarios y roles sigue siendo una feature pendiente.

## Preparar un entorno

1. Configurar DATABASE_URL en el entorno de despliegue. En desarrollo, configurar
   también SHADOW_DATABASE_URL con una base diferente de la principal.
2. Configurar APP_URL con el origen público exacto (por ejemplo,
   https://nomina.example.com). En desarrollo, el valor por defecto es
   http://localhost:3000. Las mutaciones HTTP rechazan otros orígenes.
3. Configurar SEED_ADMIN_USERNAME (por defecto admin), SEED_ADMIN_NAME y
   SEED_ADMIN_PASSWORD con una contraseña temporal de 12 a 128 caracteres.
   No usar una contraseña compartida incorporada al código ni versionar .env.
4. Instalar dependencias con pnpm install --frozen-lockfile y generar el cliente
   con pnpm db:generate.
5. En producción ejecutar pnpm db:deploy. En desarrollo, pnpm db:migrate.
6. Ejecutar pnpm db:seed antes de habilitar el acceso a la aplicación.
7. Ingresar en /login y cambiar la contraseña temporal en el diálogo obligatorio.
   El cambio invalida todas las sesiones; ingresar nuevamente con la nueva clave.
8. Retirar SEED_ADMIN_PASSWORD del entorno después del primer acceso. Las
   siguientes ejecuciones no la necesitan si la cuenta ya existe.

En el entorno local preparado por esta feature, el usuario inicial es admin y su
contraseña temporal aleatoria está únicamente en SEED_ADMIN_PASSWORD de .env.

## Catálogo y repetición del seed

src/shared/permisos.ts es el catálogo versionado. Al implementar una operación,
agregar allí su código estable y protegerla con permissionProcedure(codigo).
prisma/seed.ts inserta o actualiza nombres del catálogo y asigna los permisos al
rol ADMINISTRADOR. Los códigos anticipados para módulos futuros no implementan
por sí solos esas funcionalidades.

El seed no elimina permisos, no modifica asignaciones de otros roles y no cambia
contraseña, nombre, rol, estado o debeCambiarPassword de usuarios existentes.
Tampoco reactiva roles deshabilitados. Si el username configurado pertenece a una
cuenta que no es administradora activa, falla sin tomarla ni elevar sus permisos.
No usar el seed como mecanismo de recuperación de contraseña.

## Contraseñas iniciales de futuros usuarios

Usuario.debeCambiarPassword tiene default true. Los futuros servicios de creación
y restablecimiento deben guardar un hash Argon2id de la contraseña temporal,
establecer este indicador y revocar sesiones al restablecer. El único flujo que
lo desactiva verifica la contraseña actual, exige una nueva distinta y guarda
ambos cambios en una transacción. Nunca aceptar este indicador desde un formulario
general de edición de usuarios.

Mientras el indicador sea true, el backend solo permite consultar la identidad,
cambiar la contraseña y cerrar sesión. El dashboard redirige al diálogo. Las
sesiones duran ocho horas, usan cookies HttpOnly y Secure en producción, y se
validan contra estados y permisos actuales en cada petición. El login limita a
cinco intentos por username en una ventana de quince minutos persistida en MySQL.

## Validación

pnpm lint

pnpm typecheck

pnpm test:auth

pnpm test:auth:ui

La prueba de navegador usa Edge instalado en el equipo, sin ventana, y levanta
un servidor temporal en http://localhost:3100. Utiliza una cuenta temporal;
no consume el primer inicio de sesión del administrador del propietario.

Las pruebas de integración requieren la base migrada y .env. Crean usuarios y un
rol temporales que eliminan al finalizar; sincronizan el catálogo administrador
mediante el seed y no modifican credenciales del administrador del propietario.

Validar en navegador: login temporal, redirección al diálogo, errores por claves
distintas o repetidas, cambio correcto, nuevo login, consulta de períodos y logout.
