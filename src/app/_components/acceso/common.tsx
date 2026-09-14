"use client";

import Link from "next/link";
import { useState } from "react";
import { type inferRouterOutputs } from "@trpc/server";
import { type AppRouter } from "~/server/api/root";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "~/components/ui/select";
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

export type Salidas = inferRouterOutputs<AppRouter>;
export type Identidad = Salidas["auth"]["me"];

export function EncabezadoAcceso({
  titulo,
  descripcion,
  identidad,
  children,
}: {
  titulo: string;
  descripcion: string;
  identidad: Identidad;
  children?: React.ReactNode;
}) {
  const rutas = [
    { href: "/usuarios", nombre: "Usuarios", permiso: "USERS.VIEW" },
    { href: "/roles", nombre: "Roles", permiso: "ROLES.VIEW" },
    { href: "/permisos", nombre: "Permisos", permiso: "PERMISSIONS.VIEW" },
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Usuarios y acceso</p>
          <h2 className="text-3xl font-semibold tracking-tight">{titulo}</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl">{descripcion}</p>
        </div>
        {children}
      </div>
      <nav
        aria-label="Administración de acceso"
        className="flex flex-wrap gap-2"
      >
        {rutas
          .filter((ruta) => identidad.permisos.includes(ruta.permiso))
          .map((ruta) => (
            <Button
              key={ruta.href}
              variant={titulo === ruta.nombre ? "default" : "outline"}
              nativeButton={false}
              render={<Link href={ruta.href} />}
            >
              {ruta.nombre}
            </Button>
          ))}
      </nav>
    </div>
  );
}

export function Selector({
  etiqueta,
  valor,
  opciones,
  onChange,
  disabled,
}: {
  etiqueta: string;
  valor: string;
  opciones: { value: string; label: string }[];
  onChange: (valor: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={valor}
      items={opciones}
      onValueChange={(value) => onChange(value ?? "")}
      disabled={disabled}
    >
      <SelectTrigger aria-label={etiqueta} className="w-full min-w-40">
        <SelectValue placeholder={etiqueta} />
      </SelectTrigger>
      <SelectContent>
        {opciones.map((opcion) => (
          <SelectItem key={opcion.value} value={opcion.value}>
            {opcion.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function Paginacion({
  pagina,
  total,
  tamano = 15,
  onChange,
  pendiente,
}: {
  pagina: number;
  total: number;
  tamano?: number;
  onChange: (pagina: number) => void;
  pendiente?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <p className="text-muted-foreground text-sm">
        {total} registros · Página {pagina} de{" "}
        {Math.max(1, Math.ceil(total / tamano))}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={pagina <= 1 || pendiente}
          onClick={() => onChange(pagina - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          disabled={pagina * tamano >= total || pendiente}
          onClick={() => onChange(pagina + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}

export function ErrorAcceso({ mensaje }: { mensaje?: string | null }) {
  return mensaje ? (
    <Alert variant="destructive">
      <AlertDescription>
        {mensaje === "UNAUTHORIZED" ? (
          <span>
            Tu sesión terminó.{" "}
            <Link href="/login" className="underline">
              Inicia sesión nuevamente
            </Link>
            .
          </span>
        ) : (
          mensaje
        )}
      </AlertDescription>
    </Alert>
  ) : null;
}

export function useAccionAcceso() {
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  async function ejecutar(accion: () => Promise<void>) {
    if (pendiente) return;
    setPendiente(true);
    setError(null);
    setMensaje(null);
    try {
      await accion();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo completar la operación",
      );
    } finally {
      setPendiente(false);
    }
  }
  return { pendiente, error, mensaje, setError, setMensaje, ejecutar };
}

export function ConfirmacionAcceso({
  titulo,
  descripcion,
  abierto,
  pendiente,
  error,
  onClose,
  onConfirm,
}: {
  titulo: string;
  descripcion: string;
  abierto: boolean;
  pendiente: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      open={abierto}
      onOpenChange={(open) => {
        if (!open && !pendiente) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descripcion}</AlertDialogDescription>
        </AlertDialogHeader>
        <ErrorAcceso mensaje={error} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pendiente}>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={pendiente} onClick={onConfirm}>
            {pendiente ? "Guardando…" : "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
