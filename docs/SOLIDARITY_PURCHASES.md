# Compras solidarias

## Uso

- En `/empleados`, «Tienda Solidaria» abre el formulario con el empleado fijo.
- En `/asociacion/compras` se consultan, crean, editan y eliminan compras.
- Por defecto se consulta el único período abierto, aunque sea de otro mes/año.
  Si no existe, se informa y se permite seleccionar un período histórico.
- Las compras de períodos cerrados son de solo consulta. Al consultar uno no
  se permite crear hasta seleccionar el abierto.
- El formulario compartido pide empleado (si no está fijado), monto positivo
  en Q con hasta dos decimales y detalle de 1 a 500 caracteres sin espacios vacíos.
- Cada compra es independiente. El listado permite filtrar por empleado y
  detalle, muestra autor/fecha, última edición y el total de los filtros.
- La edición conserva empleado, período, fecha y autor originales; cambia solo
  monto y detalle. La eliminación es física, requiere confirmación y versión
  vigente, y no existe recuperación desde la aplicación.
- No hay cuotas, financiamiento, control de pagos ni campo `solicitudId`.
  El botón se bloquea al enviar; dos solicitudes distintas crean dos compras.

## Permisos

| Código                         | Operación                                     |
| ------------------------------ | --------------------------------------------- |
| `ASSOCIATION.PURCHASES.VIEW`   | Pantalla, listado, filtros, histórico y total |
| `ASSOCIATION.PURCHASES.CREATE` | Creación y selector de empleados activos      |
| `ASSOCIATION.PURCHASES.UPDATE` | Edición de monto/detalle                      |
| `ASSOCIATION.PURCHASES.DELETE` | Eliminación                                   |

El acceso desde Empleados requiere además `EMPLOYEES.VIEW`. La gestión propia
no requiere consultar salarios ni tener permisos de administración de períodos.
No exige jefatura. Los permisos antiguos `ASSOCIATION.VIEW/MANAGE` no sustituyen
los nuevos. El seed registra el catálogo y asigna los permisos al administrador;
los demás roles existentes se configuran desde Roles sin sobrescribir ajustes.

## Integridad

`CompraSolidaria` relaciona empleado, período, usuario de registro y último
editor, conserva fechas, monto `Decimal(12,2)`, detalle y versión. Las bajas de
empleados impiden nuevas compras, pero se pueden corregir compras anteriores
mientras su período siga abierto. Un traslado no cambia el empleado ni período.

Las escrituras toman los bloqueos de organización, seguridad y período en ese
orden, compatibles con bajas, revocación de permisos y cierre. Se revalida la
sesión en el servicio, incluso al invocarlo directamente. Si cambia el período
mientras el modal está abierto, se rechaza el envío; nunca se traslada al nuevo.

El índice funcional MySQL `uq_periodo_nomina_unico_abierto` permite múltiples
CERRADO (clave NULL) y como máximo un ABIERTO (clave 1). Se mantiene en la
migración SQL porque Prisma no representa índices funcionales en su esquema.
No sustituir las migraciones por `db push`. La migración falla si hay más de un
abierto previo: el propietario debe decidir cuáles cerrar antes de aplicarla.

`acumuladosComprasPeriodo(tx, periodoId)` agrupa importes exactos por empleado
para el futuro procesador, siempre usando el período explícito. No procesa
nómina ni aplica aún descuentos. El ahorro solidarista del 3% queda separado.

## Instalación y validación

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm lint
pnpm typecheck
pnpm test:tienda
pnpm test:tienda:ui
```

Los comandos de pruebas crean una base aleatoria `nomina_test_tienda_*`, aplican
migraciones y la eliminan al terminar. Requieren permisos MySQL de creación y
eliminación de esa base. No cierran ni modifican períodos de la base principal.

Si se autoriza reutilizar la shadow desechable, se puede pasar `--shadow` a
ambos comandos. Esa opción reinicia exclusivamente `SHADOW_DATABASE_URL`,
verifica que sea distinta de la principal y no debe ejecutarse a la vez que
Prisma Migrate u otra prueba que use la misma shadow. Nunca ejecutarla sobre
una shadow que contenga datos que se deban conservar.

Las pruebas de backend incluyen compras y regresión de novedades;
las de navegador cubren las dos entradas de compras y administración de períodos.

## Resultado de validación local

- Generación Prisma, migración y seed completados en la base local. Existía
  únicamente septiembre de 2026 abierto y se conservó sin cerrar períodos.
- `pnpm typecheck`: correcto.
- `pnpm lint`: sin errores; tres advertencias previas en Ausencias.
- `pnpm test:tienda --shadow`: 16 comprobaciones aprobadas.
- `pnpm test:tienda:ui --shadow`: dos recorridos aprobados, incluidos creación
  desde ambas pantallas, edición, confirmación de eliminación, filtros,
  histórico, cierre con formulario abierto, permisos y ancho móvil.
- La shadow se reutilizó con autorización del propietario. No se ejecutaron
  pruebas contra los datos operativos de la base principal.
- Se intentó adicionalmente la suite existente de Ausencias: dejó de avanzar
  después de su primera comprobación y se interrumpió su proceso. Esa suite
  no se considera validada ni forma parte de `test:tienda`.
