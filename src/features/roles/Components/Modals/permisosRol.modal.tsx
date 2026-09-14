"use client";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { MODULOS_PERMISOS } from "~/shared/modulos-permisos";
import type { PermisosRolModalProps } from "../../Models/permisosRol.model";
export function PermisosRolModal({
  rolPermisos,
  setRolPermisos,
  accion,
  confirmarPermisos,
  setConfirmarPermisos,
  buscarPermiso,
  setBuscarPermiso,
  seleccionados,
  setSeleccionados,
  agregados,
  retirados,
  visibles,
  grupos,
  errorCatalogo,
  cargandoCatalogo,
}: PermisosRolModalProps) {
  return (
    <Dialog
      open={!!rolPermisos}
      onOpenChange={(open) => {
        if (!open && !accion.pendiente && !confirmarPermisos)
          setRolPermisos(null);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Permisos de {rolPermisos?.nombre}</DialogTitle>
          <DialogDescription>
            Selecciona los permisos por módulo. Al guardar se cerrarán las
            sesiones de los usuarios de este rol.
          </DialogDescription>
        </DialogHeader>
        <Input
          aria-label="Buscar permisos del rol"
          placeholder="Buscar nombre o código"
          value={buscarPermiso}
          onChange={(e) => setBuscarPermiso(e.target.value)}
        />
        <ErrorAcceso mensaje={errorCatalogo ?? accion.error} />
        {cargandoCatalogo ? (
          <p>Cargando permisos…</p>
        ) : (
          <div className="max-h-[40vh] space-y-5 overflow-y-auto">
            {grupos.map((grupo) => (
              <fieldset key={grupo} className="space-y-3">
                <legend className="mb-2 font-semibold">
                  {MODULOS_PERMISOS[grupo] ?? grupo}
                </legend>
                {visibles
                  .filter((p) => p.modulo === grupo)
                  .map((permiso) => (
                    <div
                      key={permiso.codigo}
                      className="flex items-start gap-3"
                    >
                      <Checkbox
                        id={`p-${permiso.id}`}
                        checked={seleccionados.includes(permiso.codigo)}
                        disabled={!permiso.asignable || accion.pendiente}
                        onCheckedChange={(checked) =>
                          setSeleccionados((actual) =>
                            checked
                              ? [...actual, permiso.codigo]
                              : actual.filter((c) => c !== permiso.codigo),
                          )
                        }
                      />
                      <Label
                        htmlFor={`p-${permiso.id}`}
                        className="grid gap-1 font-normal"
                      >
                        <span>{permiso.nombre}</span>
                        <span className="text-muted-foreground text-xs">
                          {permiso.codigo}
                          {!permiso.asignable ? " · Fuera de tu alcance" : ""}
                        </span>
                      </Label>
                    </div>
                  ))}
              </fieldset>
            ))}
            {!grupos.length && <p>No se encontraron permisos.</p>}
          </div>
        )}
        <Alert>
          <AlertDescription>
            <div className="space-y-2">
              <p>
                {seleccionados.length} seleccionados · {agregados.length} por
                agregar · {retirados.length} por retirar
              </p>
              {agregados.length > 0 && (
                <p className="text-xs break-words">
                  Agregar: {agregados.join(", ")}
                </p>
              )}
              {retirados.length > 0 && (
                <p className="text-xs break-words">
                  Retirar: {retirados.join(", ")}
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={accion.pendiente}
            onClick={() => setRolPermisos(null)}
          >
            Cancelar
          </Button>
          <Button
            disabled={
              accion.pendiente ||
              cargandoCatalogo ||
              !!errorCatalogo ||
              (!agregados.length && !retirados.length)
            }
            onClick={() => {
              accion.setError(null);
              setConfirmarPermisos(true);
            }}
          >
            Guardar permisos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
