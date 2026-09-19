"use client";
import { useState } from "react";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { Selector } from "~/components/acceso/Selector";
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
import {
  crearEmpleadoSchema,
  editarEmpleadoSchema,
} from "~/server/empleados/Models/empleados.schema";
import { api } from "~/trpc/react";
import { fechaInput, hoyGuatemala } from "../../Helpers/empleados.helper";
import type { EditorEmpleadoProps } from "../../Models/empleados.model";

export function EditorEmpleadoModal({
  empleado,
  onCerrar,
  onGuardado,
}: EditorEmpleadoProps) {
  const [codigo, setCodigo] = useState(empleado?.codigo ?? "");
  const [nombre, setNombre] = useState(empleado?.nombre ?? "");
  const [nacimiento, setNacimiento] = useState(
    empleado ? fechaInput(empleado.fechaNacimiento) : "",
  );
  const [ingreso, setIngreso] = useState(
    empleado ? fechaInput(empleado.fechaIngreso) : hoyGuatemala(),
  );
  const [salario, setSalario] = useState(empleado?.salarioBase ?? "");
  const [departamento, setDepartamento] = useState(
    empleado ? String(empleado.departamento.id) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const utils = api.useUtils();
  const departamentos = api.empleados.departamentos.useQuery();
  async function guardado() {
    await utils.empleados.invalidate();
    onGuardado();
  }
  const crear = api.empleados.crear.useMutation({ onSuccess: guardado });
  const editar = api.empleados.editar.useMutation({
    onSuccess: guardado,
    onError: async (fallo) => {
      if (fallo.data?.code === "CONFLICT") await utils.empleados.invalidate();
    },
  });
  const pendiente = crear.isPending || editar.isPending;
  const opciones = (departamentos.data ?? [])
    .filter((d) => d.estado === "ACTIVO")
    .map((d) => ({ value: String(d.id), label: d.nombre }));
  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto && !pendiente) onCerrar();
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
        showCloseButton={!pendiente}
      >
        <DialogHeader>
          <DialogTitle>
            {empleado ? "Editar empleado" : "Crear empleado"}
          </DialogTitle>
          <DialogDescription>
            Registra los datos personales, laborales y el salario base mensual.
            El código no se modifica después de crear el empleado.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (pendiente) return;
            setError(null);
            const campos = {
              nombre,
              fechaNacimiento: nacimiento,
              fechaIngreso: ingreso,
              salarioBase: salario,
              departamentoId: Number(departamento),
            };
            if (empleado) {
              const resultado = editarEmpleadoSchema.safeParse({
                ...campos,
                id: empleado.id,
                version: empleado.version,
              });
              if (!resultado.success) {
                setError(
                  resultado.error.issues[0]?.message ?? "Revisa los datos",
                );
                return;
              }
              editar.mutate(resultado.data);
            } else {
              const resultado = crearEmpleadoSchema.safeParse({
                ...campos,
                codigo,
              });
              if (!resultado.success) {
                setError(
                  resultado.error.issues[0]?.message ?? "Revisa los datos",
                );
                return;
              }
              crear.mutate(resultado.data);
            }
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="empleado-codigo">Código</Label>
              <Input
                id="empleado-codigo"
                required
                maxLength={50}
                readOnly={!!empleado}
                disabled={pendiente}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empleado-nombre">Nombre completo</Label>
              <Input
                id="empleado-nombre"
                required
                maxLength={150}
                disabled={pendiente}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empleado-nacimiento">Fecha de nacimiento</Label>
              <Input
                id="empleado-nacimiento"
                type="date"
                required
                min="1900-01-01"
                max={hoyGuatemala()}
                disabled={pendiente}
                value={nacimiento}
                onChange={(e) => setNacimiento(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empleado-ingreso">Fecha de ingreso</Label>
              <Input
                id="empleado-ingreso"
                type="date"
                required
                min={nacimiento || "1900-01-01"}
                disabled={pendiente}
                value={ingreso}
                onChange={(e) => setIngreso(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empleado-salario">Salario base mensual (Q)</Label>
              <Input
                id="empleado-salario"
                type="number"
                required
                min="0.01"
                max="9999999999.99"
                step="0.01"
                disabled={pendiente}
                value={salario}
                onChange={(e) => setSalario(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Departamento</p>
              <Selector
                etiqueta="Departamento"
                valor={departamento}
                opciones={opciones}
                disabled={
                  pendiente || departamentos.isPending || departamentos.isError
                }
                onChange={setDepartamento}
              />
            </div>
          </div>
          {departamentos.isPending && (
            <p role="status">Cargando departamentos…</p>
          )}
          {departamentos.isSuccess && !opciones.length && (
            <p role="status">
              No hay departamentos activos. Solicita la activación de un
              departamento para registrar empleados.
            </p>
          )}
          <ErrorAcceso
            mensaje={
              error ??
              crear.error?.message ??
              editar.error?.message ??
              departamentos.error?.message
            }
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pendiente}
              onClick={onCerrar}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={pendiente || !opciones.length || departamentos.isError}
            >
              {pendiente ? "Guardando…" : "Guardar empleado"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
