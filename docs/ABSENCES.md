# Gestión de ausencias

Implementado en `feature/absences`, con backend y frontend por entidad.
Reutiliza `Ausencia`, la relación opcional uno a uno `Usuario.empleadoId` y la
migración `20260919220838_add_ausencias_and_user_employee_relation` existentes.
Esta implementación no modifica el esquema ni agrega otra migración.

## Reglas

- Solo un usuario con empleado activo vinculado y `ABSENCES.CREATE` puede crear
  solicitudes. Siempre son para ese empleado; tampoco el administrador puede
  solicitar para terceros. Sin vínculo no se permite crear.
- El backend toma empleado, departamento y creador de la identidad vigente. La
  solicitud inicia PENDIENTE y `aCuentaSalario` inicia en false.
- `departamentoId` conserva el departamento al crear la solicitud. Un traslado
  posterior no modifica solicitudes anteriores. Las nuevas usan el nuevo destino.
- Solo el jefe vigente del departamento guardado puede aprobar o rechazar, con
  `ABSENCES.APPROVE` y empleado activo. El nombre del rol y el permiso por sí solos
  no conceden jefatura. Tampoco existe excepción para administradores.
- Un jefe puede aprobar o rechazar su propia solicitud cuando dirige el
  departamento de esa solicitud.
- Al aprobar o rechazar, el jefe debe indicar `aCuentaSalario`. Se conserva su
  decisión incluso en un rechazo; una solicitud rechazada no habilita descuentos.
- APROBADA y RECHAZADA son resoluciones definitivas. No hay procedimientos de
  reversión, edición, eliminación ni aplicación a nómina.
- Las fechas son días calendario, con inicio <= fin, dentro del mismo mes y año
  y no anteriores al ingreso del empleado. Se admiten solicitudes de un solo día.
- Se permite solicitar antes de crear el período mensual. Si ya está CERRADO,
  no se puede crear ni resolver. El cierre se coordina transaccionalmente con
  las operaciones de ausencias.
- No se calculan descuentos, salarios ni días laborados. El estado existente
  APLICADA_NOMINA puede consultarse, pero no se genera desde estos procedimientos.
- No se introduce una restricción adicional de solapamiento de solicitudes;
  esa regla no forma parte del alcance acordado.

## Procedimientos tRPC

Las fechas de entrada utilizan texto `AAAA-MM-DD`; se rechazan horas, fechas
inexistentes y conversiones ambiguas de zona horaria. Las salidas contienen Date
serializados por la infraestructura SuperJSON del proyecto.

| Procedimiento                 | Entrada                                                                                         | Permiso                            |
| ----------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------- |
| `ausencias.crear`             | `fechaInicio`, `fechaFin`, `motivo`                                                             | `ABSENCES.CREATE`                  |
| `ausencias.listar`            | `pagina`, `tamano`, `busqueda`, `empleadoId?`, `departamentoId?`, `estado?`, `desde?`, `hasta?` | `ABSENCES.VIEW`                    |
| `ausencias.obtener`           | `id`                                                                                            | `ABSENCES.VIEW`                    |
| `ausencias.aprobar`           | `id`, `version`, `aCuentaSalario`, `comentarioResolucion?`                                      | `ABSENCES.APPROVE` y jefatura real |
| `ausencias.rechazar`          | Igual que aprobar                                                                               | `ABSENCES.APPROVE` y jefatura real |
| `ausencias.contexto`          | Sin entrada                                                                                     | `ABSENCES.VIEW`                    |
| `ausencias.empleadosRevision` | Sin entrada                                                                                     | `ABSENCES.VIEW` y jefatura real    |

Los esquemas son estrictos: no aceptan campos adicionales. Motivo obligatorio,
comentario opcional, ambos con máximo de 500 caracteres. El listado devuelve
`{ total, filas }`, con página inicial 1 y tamaño predeterminado 15 (máximo 100).
La búsqueda incluye motivo, nombre y código de empleado. `desde`/`hasta` filtran
por intersección con el rango de la ausencia, incluyendo ambos extremos.

`listar` y `obtener` aceptan `ambito: "propias" | "departamento"`. El primero
exige empleado vinculado y limita la consulta a ese empleado; el segundo exige
jefatura y limita al departamento dirigido. El contrato previo sin ámbito mantiene la
consulta administrativa global; no se utiliza para alimentar las pestañas.

`listar` también admite `ingresadaDesde` e `ingresadaHasta`: días completos de
fecha de creación de la solicitud, en hora de Guatemala. El rango de ausencia
y el de ingreso de solicitud son filtros independientes.

Las respuestas incluyen datos mínimos del empleado, departamento, creador y
resolutor; no incluyen salarios, contraseñas ni otros datos de cuenta.

## Ámbitos de consulta

`ABSENCES.VIEW` permite al empleado consultar sus solicitudes. Si además es jefe
asignado, permite consultar las del departamento que dirige. Sin vínculo, el
listado queda vacío.

Los filtros se intersectan con el ámbito autorizado. Un detalle fuera del ámbito
devuelve NOT_FOUND. Los servicios verifican sesión y permisos vigentes incluso
cuando se invocan directamente o con un contexto capturado antes de un cambio.

## Vinculación y autenticación

`usuarios.asignarEmpleado({ id, version, empleadoId })` requiere
`USERS.ASSIGN_EMPLOYEE`. `empleadoId: null` desvincula. Se exige empleado activo y
no vinculado a otro usuario; se comprueba la delegación sobre el rol objetivo.
No se permite cambiar el vínculo propio. Cada cambio incrementa versión y revoca
las sesiones del usuario objetivo. El listado de usuarios y la identidad de
sesión incluyen `empleadoId` para el futuro frontend.

Login, recuperación de sesión, autorización de servicios y cambio inicial de
contraseña rechazan cuentas con empleado INACTIVO. Las cuentas sin empleado
mantienen las validaciones de usuario y rol. La baja del empleado revoca sesiones
en la misma transacción; recontratar no revive tokens anteriores.

## Concurrencia

Las escrituras de ausencias usan el bloqueo de organización compartido con
empleados, departamentos, login, vinculación y cierre de período. Después toman
el bloqueo de seguridad antes de verificar los permisos. El orden es siempre
organización y luego seguridad. Las resoluciones comparan estado PENDIENTE,
ID y versión en una misma escritura y registran usuario, fecha y comentario.
Dos resoluciones simultáneas tienen un único ganador.

## Interfaz

El sidebar conserva una única opción **Ausencias**, visible con `ABSENCES.VIEW`
y empleado vinculado. La ruta `/ausencias` muestra **Mis solicitudes** como
apartado principal. `/ausencias/revision` corresponde a **Revisión del
departamento**, accesible solo al jefe asignado. La navegación superior reutiliza
el patrón de botones/enlaces empleado en Usuarios, Roles y Permisos. Ambas rutas
validan el acceso en servidor; las pestañas no se habilitan por nombre de rol.

El historial permite consultar fechas, ingreso de solicitud, estado, motivo,
decisión salarial y detalle de resolución. Crear requiere `ABSENCES.CREATE` y
abre un formulario modal de fechas y motivo. No permite seleccionar terceros.

Revisión abre filtrada por PENDIENTE. Permite elegir todos los estados, empleado,
texto, fechas de ausencia y de ingreso de solicitud. El selector de empleados
incluye los actuales y los que conservan solicitudes históricas en el
departamento después de un traslado. Aprobar/rechazar requiere
`ABSENCES.APPROVE`; la confirmación exige escoger explícitamente Sí/No para
`aCuentaSalario` y permite comentario. Las filas resueltas solo admiten consulta.

Las dos vistas incluyen paginación, estados vacíos, carga, errores, actualización
manual y confirmaciones de guardado. Los conflictos mantienen el modal y
actualizan la lista para consultar la resolución vigente al cerrarlo.
Los componentes viven en `src/features/ausencias`, con modales, modelos inferidos
de tRPC y helpers de presentación; las rutas conservan la autorización.

## Preparación y validación

Aplicar las migraciones existentes y regenerar Prisma al preparar otro entorno.
Ejecutar `pnpm db:seed` sincroniza el catálogo de permisos y los permisos del
administrador sin cambiar credenciales existentes. Las plantillas de roles nuevos
incluyen consulta global para RR. HH. y creación propia para jefes. El seed
conserva roles ya configurados: sus permisos adicionales deben asignarse desde
administración de roles según corresponda.

```bash
pnpm lint
pnpm typecheck
pnpm test:absences
pnpm test:auth
pnpm test:access
pnpm test:departments
pnpm test:auth:ui absences.spec.ts
```

Las pruebas de integración crean datos temporales y comprueban autorización,
suplantación, ámbitos, fechas, resoluciones, traslados, cierre mensual, versiones,
vínculos, baja y sesiones. Eliminan sus datos al finalizar.
