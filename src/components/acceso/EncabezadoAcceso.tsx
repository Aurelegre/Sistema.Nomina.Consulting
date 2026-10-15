"use client";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import type { Identidad } from "~/shared/Models/acceso.model";
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
