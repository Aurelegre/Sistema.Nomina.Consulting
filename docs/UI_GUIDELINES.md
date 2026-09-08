# UI Guidelines

## Principio principal

Usar shadcn/ui como biblioteca estándar de componentes de interfaz.

Tailwind CSS manual no debe ser la primera opción para construir controles interactivos.

## Componentes

Si shadcn/ui ofrece el componente, usarlo.

Preferencias:

- Button → shadcn/ui Button
- Input → shadcn/ui Input
- Label → shadcn/ui Label
- Select → shadcn/ui Select
- Checkbox → shadcn/ui Checkbox
- Switch → shadcn/ui Switch
- Card → shadcn/ui Card
- Table → shadcn/ui Table
- Dialog → shadcn/ui Dialog
- AlertDialog → shadcn/ui AlertDialog
- Sheet → shadcn/ui Sheet
- DropdownMenu → shadcn/ui DropdownMenu
- Tooltip → shadcn/ui Tooltip
- Badge → shadcn/ui Badge
- Tabs → shadcn/ui Tabs
- Form → shadcn/ui Form + validación
- Toast/Sonner → feedback no bloqueante
- Skeleton → estados de carga
- Alert → errores/información contextual

## Tailwind manual

Permitido principalmente para:

- grid/flex;
- spacing;
- responsive;
- sizing;
- alineación;
- composición del layout;
- ajustes específicos no cubiertos por shadcn/ui.

Evitar recrear manualmente estilos de componentes ya disponibles.

## Alertas y confirmaciones

No usar:
- `window.alert`
- `window.confirm`
- `window.prompt`

Usar:
- `AlertDialog` para confirmaciones destructivas/importantes.
- `Dialog` para formularios y contenido modal.
- `Alert` o `Sonner` para feedback.

## Formularios

### Hasta 2 campos simples
Puede mostrarse directamente en la página si mejora UX.

### Más de 2 campos
Usar Dialog o Sheet.

### Edición
Toda edición debe abrirse en modal, aunque tenga pocos campos.

## Acciones destructivas

Ejemplos:
- cerrar período;
- eliminar;
- desactivar;
- cancelar proceso irreversible.

Siempre requieren AlertDialog.

## Tablas

Preferir:
- Table de shadcn/ui;
- DataTable basada en TanStack Table si se necesita filtrado/paginación/ordenamiento.

Acciones de fila:
- DropdownMenu o botones shadcn/ui.

## Layout

Sidebar:
- izquierda;
- colapsable;
- persistencia de preferencia;
- responsive;
- drawer/sheet en móvil.

Header:
- título del módulo;
- contexto de navegación;
- futuras acciones de usuario.

## Permisos

La UI debe responder a permisos:

- ocultar o deshabilitar acciones no permitidas;
- no mostrar módulos no accesibles según política.

Pero esto NO sustituye autorización backend.

## Accesibilidad

Usar la accesibilidad incorporada de Radix/shadcn:
- focus management;
- aria;
- keyboard navigation;
- Escape;
- dialogs accesibles.

No reemplazar con implementaciones manuales salvo necesidad justificada.

## Migración de UI existente

La UI ya desarrollada con Tailwind manual puede seguir funcionando.

Cuando una feature sea modificada, preferir refactor progresivo hacia shadcn/ui.

No bloquear el desarrollo por reescribir toda la interfaz de una sola vez.
