# Empleados

La ruta `/empleados` implementa RF-004 y RF-007 sobre los modelos existentes de
`feature/employees`. Incluye búsqueda por nombre o código, filtros por estado,
departamento y fechas de ingreso, paginación de 15 registros y consulta detallada.
La creación y edición comparten un modal; la baja y recontratación utilizan
confirmaciones AlertDialog. Se muestran cargas, errores, resultados vacíos y
confirmaciones de guardado. Los importes se presentan en quetzales y las fechas
de calendario se muestran sin desplazamiento por zona horaria.

## Datos y operaciones

- Código único e inmutable, nombre completo, nacimiento, ingreso, departamento
  activo y salario base mensual positivo con hasta dos decimales.
- El salario viaja a la interfaz como texto decimal, evitando serializar objetos
  Decimal de Prisma. La tabla incluye la versión usada en las escrituras.
- La consulta de detalle recibe únicamente el ID y obtiene la información actual.
- La baja conserva el registro y utiliza la fecha de salida ingresada; no puede
  ser anterior al ingreso. Un jefe debe ser reemplazado antes de su baja.
- La recontratación conserva ingreso y salario, vuelve a ACTIVO y limpia la fecha
  de salida, siguiendo el contrato existente de la rama. No crea un historial de
  contratos ni calcula liquidaciones.
- Las ediciones comprueban que el ingreso no sea posterior a una salida existente.
- Un conflicto conserva el formulario y actualiza la consulta; cerrar y reabrir
  permite trabajar con la versión actual.

## Permisos y arquitectura

`EMPLOYEES.VIEW` protege la página, listado, detalle y catálogo mínimo de
departamentos. `EMPLOYEES.CREATE` permite crear y `EMPLOYEES.UPDATE` permite
editar, dar de baja y recontratar. Cada servicio vuelve a verificar la sesión y
los permisos vigentes. El catálogo de selección no exige `DEPARTMENTS.VIEW`.

La UI vive en `src/features/empleados`, con `Components/Modals`, `Models` derivados
de tRPC y `Helpers` puros. La página conserva la autorización de servidor. Las
reglas y transacciones permanecen en services, con esquemas Zod compartibles.

El modelo actual todavía no vincula usuarios con empleados: el ámbito de consulta
por jefe requiere esa relación y queda pendiente de la integración de ausencias.
Los permisos de consulta actuales conceden acceso al catálogo completo.

## Integración con departamentos

Crear un departamento exige seleccionar un empleado activo que no dirija otro
departamento. El editor permite asignar o sustituir jefe; se conservan los
departamentos iniciales sin jefe hasta su configuración. La jefatura es una
relación independiente de la adscripción laboral del empleado; asignar jefe no
traslada automáticamente al empleado.

Para iniciar el catálogo, registra empleados en uno de los departamentos
existentes y después selecciona un jefe al crear un departamento adicional.
La desactivación se rechaza si hay cualquier empleado asignado, incluso inactivo.

Las escrituras de empleados, creación/edición y desactivación de departamentos
comparten transacciones y bloquean los departamentos en orden de ID antes de
consultar y escribir. Esto coordina asignaciones y jefaturas con las bajas y evita
desactivar un departamento mientras se le asigna un empleado. Es una estrategia
conservadora para el catálogo pequeño de esta aplicación.

## Validación

```bash
pnpm lint
pnpm typecheck
pnpm test:departments
pnpm test:auth:ui employees.spec.ts departments.spec.ts
```

Las pruebas usan registros temporales y los eliminan al finalizar. Verifican
creación, edición, conflictos, baja, recontratación, fecha de salida persistida,
permisos, departamentos inactivos, jefaturas y presentación móvil.
No se modifica el esquema Prisma ni se añaden migraciones en esta ampliación.
