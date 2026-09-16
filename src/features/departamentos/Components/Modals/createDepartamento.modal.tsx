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
import { crearDepartamentoSchema } from "~/server/departamentos/Models/departamentos.schema";
import { api } from "~/trpc/react";
import type { CreateDepartamentoProps } from "../../Models/createDepartamento.model";

export function CreateDepartamentoModal({
  onCerrar,
  onGuardado,
}: CreateDepartamentoProps) {
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [cuentaContable, setCuentaContable] = useState("");
  const [error, setError] = useState<string | null>(null);
  const utils = api.useUtils();
  const crear = api.departamentos.crear.useMutation({
    onSuccess: async () => {
      await utils.departamentos.listar.invalidate();
      onGuardado();
    },
  });
  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto && !crear.isPending) onCerrar();
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        showCloseButton={!crear.isPending}
      >
        <DialogHeader>
          <DialogTitle>Crear departamento</DialogTitle>
          <DialogDescription>
            El departamento se creará activo. Su código será único y no se podrá
            modificar.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (crear.isPending) return;
            setError(null);
            const validado = crearDepartamentoSchema.safeParse({
              codigo,
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
            crear.mutate(validado.data);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="nuevo-departamento-codigo">Código</Label>
            <Input
              id="nuevo-departamento-codigo"
              required
              maxLength={50}
              value={codigo}
              disabled={crear.isPending}
              onChange={(event) => setCodigo(event.target.value)}
              aria-describedby="nuevo-departamento-codigo-ayuda"
            />
            <p
              id="nuevo-departamento-codigo-ayuda"
              className="text-muted-foreground text-sm"
            >
              Letras sin tildes, números y guion bajo. Se guardará en
              mayúsculas.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nuevo-departamento-nombre">Nombre</Label>
            <Input
              id="nuevo-departamento-nombre"
              required
              maxLength={100}
              value={nombre}
              disabled={crear.isPending}
              onChange={(event) => setNombre(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nuevo-departamento-cuenta">Cuenta contable</Label>
            <Input
              id="nuevo-departamento-cuenta"
              required
              maxLength={50}
              value={cuentaContable}
              disabled={crear.isPending}
              onChange={(event) => setCuentaContable(event.target.value)}
            />
          </div>
          <ErrorAcceso mensaje={error ?? crear.error?.message} />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={crear.isPending}
              onClick={onCerrar}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={crear.isPending}>
              {crear.isPending ? "Guardando…" : "Crear departamento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
