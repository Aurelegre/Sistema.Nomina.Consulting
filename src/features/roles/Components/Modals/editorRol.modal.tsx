"use client";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { crearRolSchema } from "~/server/Rol/Models/crearRol.schema";
import { editarRolSchema } from "~/server/Rol/Models/editarRol.Schema";
import { textoFormulario } from "~/shared/form-data";
import { api } from "~/trpc/react";
import type { EditorRolModalProps } from "../../Models/editorRol.model";
export function EditorRolModal({
  editor,
  setEditor,
  accion,
  actualizar,
}: EditorRolModalProps) {
  const utils = api.useUtils();
  return (
    <Dialog
      open={!!editor}
      onOpenChange={(open) => {
        if (!open && !accion.pendiente) setEditor(null);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editor === "nuevo" ? "Crear rol" : "Editar rol"}
          </DialogTitle>
          <DialogDescription>
            El código identifica al rol y permanece fijo después de crearlo.
          </DialogDescription>
        </DialogHeader>
        {editor && (
          <form
            key={editor === "nuevo" ? "nuevo" : editor.id}
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const datos = new FormData(e.currentTarget);
              void accion.ejecutar(async () => {
                const campos = {
                  nombre: textoFormulario(datos, "nombre"),
                  descripcion: textoFormulario(datos, "descripcion"),
                };
                if (editor === "nuevo") {
                  const validado = crearRolSchema.safeParse({
                    ...campos,
                    codigo: textoFormulario(datos, "codigo"),
                  });
                  if (!validado.success)
                    throw new Error(validado.error.issues[0]?.message);
                  await utils.client.roles.crear.mutate(validado.data);
                } else {
                  const validado = editarRolSchema.safeParse({
                    ...campos,
                    id: editor.id,
                    version: editor.version,
                  });
                  if (!validado.success)
                    throw new Error(validado.error.issues[0]?.message);
                  await utils.client.roles.editar.mutate(validado.data);
                }
                setEditor(null);
                accion.setMensaje("Rol guardado correctamente");
                await actualizar();
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                name="codigo"
                required
                maxLength={50}
                readOnly={editor !== "nuevo"}
                defaultValue={editor === "nuevo" ? "" : editor.codigo}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                name="nombre"
                required
                maxLength={100}
                defaultValue={editor === "nuevo" ? "" : editor.nombre}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                name="descripcion"
                maxLength={255}
                defaultValue={
                  editor === "nuevo" ? "" : (editor.descripcion ?? "")
                }
              />
            </div>
            <ErrorAcceso mensaje={accion.error} />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={accion.pendiente}
                onClick={() => setEditor(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={accion.pendiente}>
                {accion.pendiente ? "Guardando…" : "Guardar rol"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
