"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import { ErrorAcceso } from "~/components/acceso/ErrorAcceso";
import { Paginacion } from "~/components/acceso/Paginacion";
import { Selector } from "~/components/acceso/Selector";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "~/components/ui/alert-dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/components/ui/table";
import type {
  EditorEmpleadoUsuarioModalProps,
  EmpleadoAsignable,
} from "../../Models/editorEmpleadoUsuario.model";

export function EditorEmpleadoUsuarioModal({
  usuario,
  onCerrar,
  onAsignado,
}: EditorEmpleadoUsuarioModalProps) {
  const [busqueda, setBusqueda] = useState("");
  const [departamento, setDepartamento] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [elegido, setElegido] = useState<EmpleadoAsignable | null>(null);
  const utils = api.useUtils();
  const lista = api.usuarios.empleadosSinUsuario.useQuery({
    busqueda,
    departamentoId: departamento === "todos" ? undefined : Number(departamento),
    pagina,
  });
  const departamentos = api.usuarios.departamentosAsignacion.useQuery();
  const asignar = api.usuarios.asignarEmpleado.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.usuarios.listar.invalidate(),
        utils.usuarios.empleadosSinUsuario.invalidate(),
        utils.usuarios.departamentosAsignacion.invalidate(),
      ]);
      if (elegido) await onAsignado(elegido);
    },
    onError: async () => {
      await lista.refetch();
    },
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !asignar.isPending) onCerrar();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Asignar empleado</DialogTitle>
          <DialogDescription>
            {usuario
              ? `Selecciona el empleado para ${usuario.nombre} (${usuario.username}).`
              : "Selecciona un empleado para el nuevo usuario. Se vinculará al guardar el usuario."}{" "}
            Solo se muestran empleados activos sin usuario asignado.
          </DialogDescription>
        </DialogHeader>
        {usuario?.empleado && (
          <p className="text-sm">
            Empleado actual: {usuario.empleado.codigo} ·{" "}
            {usuario.empleado.nombre}. La nueva asignación reemplazará este
            vínculo.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            aria-label="Buscar empleados disponibles"
            placeholder="Buscar por código o nombre"
            maxLength={100}
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
          />
          <Selector
            etiqueta="Departamento del empleado"
            valor={departamento}
            opciones={[
              { value: "todos", label: "Todos los departamentos" },
              ...(departamentos.data ?? []).map((d) => ({
                value: String(d.id),
                label: d.nombre,
              })),
            ]}
            onChange={(v) => {
              setDepartamento(v);
              setPagina(1);
            }}
            disabled={departamentos.isPending || departamentos.isError}
          />
        </div>
        <ErrorAcceso
          mensaje={lista.error?.message ?? departamentos.error?.message}
        />
        <Button
          type="button"
          variant="outline"
          disabled={lista.isFetching || asignar.isPending}
          onClick={() => {
            void lista.refetch();
            void departamentos.refetch();
          }}
        >
          Actualizar empleados
        </Button>
        {lista.isPending ? (
          <p role="status">Cargando empleados…</p>
        ) : (
          !lista.isError && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.data?.filas.map((empleado) => (
                    <TableRow key={empleado.id}>
                      <TableCell>{empleado.codigo}</TableCell>
                      <TableCell>{empleado.nombre}</TableCell>
                      <TableCell>{empleado.departamento.nombre}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          disabled={lista.isFetching || asignar.isPending}
                          onClick={() => {
                            asignar.reset();
                            setElegido(empleado);
                          }}
                        >
                          Asignar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!lista.data?.filas.length && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        No hay empleados disponibles con estos filtros.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <Paginacion
                pagina={pagina}
                total={lista.data?.total ?? 0}
                pendiente={lista.isFetching || asignar.isPending}
                onChange={setPagina}
              />
            </>
          )
        )}
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={asignar.isPending}
            onClick={onCerrar}
          >
            Cancelar
          </Button>
        </div>
        <AlertDialog
          open={!!elegido}
          onOpenChange={(open) => {
            if (!open && !asignar.isPending) setElegido(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar asignación</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Asignar a {elegido?.nombre} ({elegido?.codigo}), de{" "}
                {elegido?.departamento.nombre},{" "}
                {usuario
                  ? `al usuario ${usuario.username}`
                  : "al nuevo usuario"}
                ?
                {usuario
                  ? " Se cerrarán las sesiones de la cuenta para actualizar su acceso."
                  : " La asignación quedará pendiente hasta guardar el usuario."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <ErrorAcceso mensaje={asignar.error?.message} />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={asignar.isPending}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={asignar.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  if (!elegido || asignar.isPending) return;
                  if (usuario)
                    asignar.mutate({
                      id: usuario.id,
                      version: usuario.version,
                      empleadoId: elegido.id,
                    });
                  else void onAsignado(elegido);
                }}
              >
                {asignar.isPending ? "Asignando…" : "Confirmar asignación"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
