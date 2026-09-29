# Novedades del departamento

## Alcance implementado

Ruta `/mi-departamento`, accesible desde «Mi departamento» para el jefe vigente
de un departamento ACTIVO. El usuario debe estar vinculado a un empleado activo
y tener los permisos correspondientes. El nombre del rol no sustituye la
jefatura real; tampoco existe una excepción de administrador.

La pantalla lista empleados actualmente asignados, con búsqueda y paginación,
detalle modal y acumulados del período elegido. Incluye inactivos para consulta;
solo admite registros para empleados activos. Los períodos cerrados son de
consulta. No requiere permisos globales de empleados ni de períodos.

## Desarrollo paso a paso

1. **Autorización:** comprobar sesión, permisos vigentes, empleado vinculado y
   departamento dirigido. Aplicar el ámbito tanto en consultas como en escrituras.
2. **Persistencia:** `NovedadNomina` conserva empleado, período, departamento al
   registrar, usuario autor, tipo, cantidad decimal, fecha e identificador único
   de solicitud. Cada captura agrega un movimiento; no reemplaza el total.
3. **Servicio:** validar cantidades positivas, hasta dos decimales para horas y
   ventas y piezas enteras; comprobar empleado activo, pertenencia y período
   abierto no anterior al ingreso. Reutilizar el bloqueo de organización y luego
   el de seguridad para coordinar traslados, jefaturas, permisos y cierre.
4. **API:** procedimientos tRPC `contexto`, `listar`, `detalle` y `registrar`, con
   contratos Zod estrictos. El servicio vuelve a comprobar la autorización para
   impedir saltarla mediante llamadas directas.
5. **Frontend:** selector de período, tabla departamental, detalle modal y modal
   por tipo de captura. El mensaje explica que se agrega una cantidad. Se
   actualizan los acumulados al guardar, con estados de carga, error y vacío.
6. **Validación:** pruebas de integración de autorización, acumulación,
   concurrencia, idempotencia y cierre; prueba Playwright del flujo de pantalla.
7. **Futura nómina:** agregar por empleado, período y tipo, considerando todos
   los departamentos históricos. Integrar los resultados en el procedimiento
   MySQL de fin de mes y conservar los importes aplicados al cerrar la nómina.

## Permisos

| Código                        | Acción                                                            |
| ----------------------------- | ----------------------------------------------------------------- |
| `DEPARTMENT_EMPLOYEES.VIEW`   | Entrar y consultar empleados/acumulados del departamento dirigido |
| `DEPARTMENT_EMPLOYEES.DETAIL` | Consultar detalle personal y laboral                              |
| `PAYROLL_NEWS.OVERTIME`       | Registrar horas extras                                            |
| `PAYROLL_NEWS.DOUBLE_TIME`    | Registrar horas dobles                                            |
| `PAYROLL_NEWS.PRODUCTION`     | Registrar piezas exclusivamente en `PRODUCCION`                   |
| `PAYROLL_NEWS.SALES`          | Registrar ventas exclusivamente en `MERCADEO`                     |

Todas las acciones requieren además `DEPARTMENT_EMPLOYEES.VIEW` y jefatura
vigente. Las restricciones especiales utilizan el código inmutable del
departamento, no su nombre editable. Las ventas se capturan en quetzales.

El seed crea los permisos y los incorpora a la plantilla de nuevos roles
`JEFE_DEPARTAMENTO`. Los roles existentes conservan sus ajustes: asignar los
permisos desde Roles. Los permisos globales `PAYROLL_NEWS.MANAGE` y
`EMPLOYEES.VIEW` no conceden acceso a esta pantalla por sí solos.
Los permisos globales ya asignados a roles existentes no se revocan.

## Acumulación y trazabilidad

- Dos capturas de 1.25 y 2.75 horas producen 4.00 horas en ese período.
- Horas extras y dobles se acumulan por separado.
- Cada nuevo registro tiene un UUID. Repetir exactamente la misma solicitud
  devuelve el registro existente sin duplicarlo; cambiar su contenido produce
  conflicto. Esto también permite confirmar un envío ya guardado tras el cierre.
- Se usa `Decimal`, sin sumar importes monetarios con coma flotante.
- Los acumulados de esta pantalla incluyen únicamente movimientos del
  departamento dirigido. Un traslado conserva los registros anteriores en BD;
  la futura nómina deberá sumar todos los registros del empleado en el período.
- Esta etapa no ofrece edición, eliminación ni anulación de movimientos.

## Cálculo posterior

Conforme a las reglas funcionales del proyecto:

- Horas extras: cantidad × (salario base / 240) × 1.5.
- Horas dobles: cantidad × (salario base / 240) × 2.
- Bonificación por producción: piezas acumuladas × Q0.01.
- Comisiones: ventas acumuladas × porcentaje correspondiente al rango mensual.

Estos pagos **no se calculan ni contabilizan en esta etapa**. Debe definirse la
interpretación de los centavos entre los límites documentados de ventas
(por ejemplo, Q100,000.01–Q100,000.99), el redondeo y el salario aplicable antes
de implementar el procesamiento. No aplicar el porcentaje por cada captura:
se determina a partir del total mensual.

## Instalación y comprobación

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm lint
pnpm typecheck
pnpm test:novedades
pnpm test:auth:ui novedades.spec.ts
```

Migración: `20260929053306_department_payroll_news`.
Las pruebas crean datos propios con prefijo aleatorio y los retiran al finalizar.
No ejecutar pruebas concurrentes que cambien los mismos catálogos de seguridad.

Validación local realizada: generación y migración Prisma, seed y typecheck
correctos; lint sin errores (tres advertencias preexistentes en Ausencias).
`test:novedades`: ocho comprobaciones aprobadas. Playwright: un recorrido
aprobado con detalle, captura de horas extras/dobles, acumulación, recarga,
cierre, pérdida de jefatura y ancho móvil. La exclusividad de Producción y
Mercadeo se verifica por reglas y rechazo en backend; el recorrido de navegador
se ejecuta sobre un departamento de prueba general.
