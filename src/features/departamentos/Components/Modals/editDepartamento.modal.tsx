"use client";

import { useState } from "react";
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
import { editarDepartamentoSchema } from "~/server/departamentos/Models/departamentos.schema";
import { api } from "~/trpc/react";
import type { EditDepartamentoProps } from "../../Models/editDepartamento.model";

export function EditDepartamentoModal({
  departamento,
  onCerrar,
  onGuardado,
}: EditDepartamentoProps) {
  const [nombre, setNombre] = useState(departamento.nombre);
  const [cuentaContable, setCuentaContable] = useState(
    departamento.cuentaContable ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const utils = api.useUtils();
  const editar = api.departamentos.editar.useMutation({
    onSuccess: async () => {
      await utils.departamentos.listar.invalidate();
      onGuardado();
    },
    onError: async (fallo) => {
      if (fallo.data?.code === "CONFLICT")
        await utils.departamentos.listar.invalidate();
    },
  });

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto && !editar.isPending) onCerrar();
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        showCloseButton={!editar.isPending}
      >
        <DialogHeader>
          <DialogTitle>Editar departamento</DialogTitle>
          <DialogDescription>
            Actualiza el nombre y la cuenta contable. El código identifica al
            departamento y no se modifica.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (editar.isPending) return;
            setError(null);
            const validado = editarDepartamentoSchema.safeParse({
              id: departamento.id,
              version: departamento.version,
              nombre,
              cuentaContable,
            });
            if (!validado.success) {
              setError(
                validado.error.issues[0]?.message ??
                  "Revisa los datos ingresados",
              );
              return;
            }
            editar.mutate(validado.data);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="departamento-codigo">Código</Label>
            <Input
              id="departamento-codigo"
              readOnly
              value={departamento.codigo}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="departamento-nombre">Nombre</Label>
            <Input
              id="departamento-nombre"
              required
              maxLength={100}
              value={nombre}
              disabled={editar.isPending}
              onChange={(event) => setNombre(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="departamento-cuenta">Cuenta contable</Label>
            <Input
              id="departamento-cuenta"
              required
              maxLength={50}
              value={cuentaContable}
              disabled={editar.isPending}
              onChange={(event) => setCuentaContable(event.target.value)}
              aria-describedby="departamento-cuenta-ayuda"
            />
            <p
              id="departamento-cuenta-ayuda"
              className="text-muted-foreground text-sm"
            >
              Ingresa la cuenta asignada a este departamento en el catálogo
              contable de la empresa.
            </p>
          </div>
          <ErrorAcceso mensaje={error ?? editar.error?.message} />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={editar.isPending}
              onClick={onCerrar}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={editar.isPending}>
              {editar.isPending ? "Guardando…" : "Guardar departamento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
