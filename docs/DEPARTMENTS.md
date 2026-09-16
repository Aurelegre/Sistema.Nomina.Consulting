# Departamentos

## Alcance

RF-005 y RF-006: consultar y editar los cinco departamentos de Consulting, S.A.
La ruta es `/departamentos`, dentro del layout administrativo existente.

El catálogo incluye FINANZAS, PRODUCCION, LOGISTICA, RECURSOS_HUMANOS y MERCADEO.
El código es fijo; el nombre visible y la cuenta contable se editan en un modal.
No existen procedimientos para crear, eliminar o desactivar departamentos.
Las futuras reglas específicas de un departamento deben utilizar su código,
no comparar el nombre editable.

## Cuenta contable

La cuenta se almacena como texto de hasta 50 caracteres para conservar ceros
iniciales y los separadores del catálogo contable de la empresa. No se presupone
un formato o un número de cuenta. Se recortan espacios exteriores y se rechazan
campos vacíos y caracteres de control. No se exige unicidad de cuenta entre
departamentos porque los requerimientos no establecen esa restricción.

La migración carga los cinco departamentos con `cuentaContable = null`, indicando
configuración pendiente. No es una cuenta contable válida ni un valor ficticio.
Toda edición exige una cuenta no vacía; la interfaz señala los registros que
todavía necesitan configuración. Los futuros procesos de póliza deberán
rechazar departamentos sin cuenta y conservar la cuenta aplicada al histórico.
Esta feature no implementa aún el procesamiento contable.

## Seguridad y concurrencia

- `DEPARTMENTS.VIEW`: acceso a la página y al listado.
- `DEPARTMENTS.MANAGE`: edición. Para editar desde la UI se requieren ambos.
- La asignación existente de permisos por rol se conserva. NOMINA_RRHH tiene
  consulta; el administrador puede delegar gestión desde Roles.
- El router valida permisos y entrada estricta. La policy del módulo comprueba
  nuevamente sesión, usuario, rol y permisos vigentes al entrar al servicio.
- El código no se admite como entrada de edición. Los nombres son únicos según
  la colación MySQL del proyecto y tienen un máximo de 100 caracteres.
- El servicio utiliza `updateMany` con `id` y `version` en la misma condición e
  incrementa la versión. Una escritura que no modifica filas devuelve conflicto
  si el departamento existe o NOT_FOUND si no existe.
- La respuesta de edición confirma `id` y la nueva versión. El cliente invalida
  el listado. Ante un conflicto conserva el formulario y refresca el catálogo;
  cerrar y reabrir carga los datos actuales.

## Arquitectura

Backend en `src/server/departamentos`: router, service, policy y `Models`.
Frontend en `src/features/departamentos`: vista, tabla, `Components/Modals`,
contratos `Models` y helper puro de búsqueda por nombre, código o cuenta.
Los contratos de datos de la UI se infieren de tRPC. El esquema Zod compartido
con el formulario no depende de Prisma ni de servicios.

## Instalación y validación

Aplicar las migraciones y regenerar Prisma. En desarrollo:

```bash
pnpm db:migrate
pnpm db:generate
```

En un despliegue se utiliza `pnpm db:deploy`. La migración ya incluye el catálogo;
el seed también lo prepara de manera idempotente, conservando nombres, cuentas y
versiones existentes. La shadow database debe ser diferente de la principal.

```bash
pnpm lint
pnpm typecheck
pnpm test:departments
pnpm test:auth:ui
```

Las pruebas de backend cubren catálogo, permisos, entradas inválidas, duplicados,
seed repetible, escrituras concurrentes y sesiones revocadas. Las de navegador
cubren edición, cancelación, conflictos entre pestañas, persistencia, permisos
de consulta y acceso directo a API, además de la presentación móvil.
Las cuentas de prueba se eliminan; los cambios del departamento de prueba se
restauran solo si aún coinciden con la versión y los valores escritos por la
prueba. La versión no retrocede durante la restauración.
