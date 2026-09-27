"use client";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { UsuariosTableProps } from "../Models/usuariosTable.model";
export function UsuariosTable({
  filas,
  cargando,
  pendiente,
  identidad,
  puede,
  abrirEditor,
  asignarEmpleado,
  confirmar,
}: UsuariosTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre / Usuario</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Contraseña</TableHead>
          <TableHead>Creación</TableHead>
          <TableHead>Empleado</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cargando ? (
          <TableRow>
            <TableCell colSpan={7}>Cargando usuarios…</TableCell>
          </TableRow>
        ) : filas?.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7}>No se encontraron usuarios.</TableCell>
          </TableRow>
        ) : (
          filas?.map((usuario) => (
            <TableRow key={usuario.id}>
              <TableCell>
                <div className="font-medium">{usuario.nombre}</div>
                <div className="text-muted-foreground text-xs">
                  {usuario.username}
                  {usuario.id === identidad.id ? " · Tu cuenta" : ""}
                </div>
              </TableCell>
              <TableCell>{usuario.rol.nombre}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    usuario.estado === "ACTIVO" ? "default" : "secondary"
                  }
                >
                  {usuario.estado === "ACTIVO" ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
              <TableCell>
                {usuario.debeCambiarPassword ? (
                  <Badge variant="outline">Cambio pendiente</Badge>
                ) : (
                  "Actualizada"
                )}
              </TableCell>
              <TableCell>
                {usuario.fechaCreacion.toLocaleDateString("es-GT")}
              </TableCell>
              <TableCell>
                {usuario.empleado ? (
                  <>
                    <p>
                      {usuario.empleado.codigo} · {usuario.empleado.nombre}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {usuario.empleado.departamento.nombre}
                    </p>
                  </>
                ) : (
                  "Sin empleado"
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  {usuario.administrable &&
                    usuario.id !== identidad.id &&
                    puede("USERS.ASSIGN_EMPLOYEE") && (
                      <Button
                        disabled={pendiente}
                        size="sm"
                        variant="outline"
                        onClick={() => asignarEmpleado(usuario)}
                      >
                        {usuario.empleado
                          ? "Cambiar empleado"
                          : "Asignar empleado"}
                      </Button>
                    )}
                  {usuario.administrable && puede("USERS.UPDATE") && (
                    <Button
                      disabled={pendiente}
                      size="sm"
                      variant="outline"
                      onClick={() => abrirEditor({ tipo: "editar", usuario })}
                    >
                      Editar
                    </Button>
                  )}
                  {usuario.administrable &&
                    usuario.id !== identidad.id &&
                    puede("USERS.ASSIGN_ROLE") && (
                      <Button
                        disabled={pendiente}
                        size="sm"
                        variant="outline"
                        onClick={() => abrirEditor({ tipo: "rol", usuario })}
                      >
                        Cambiar rol
                      </Button>
                    )}
                  {usuario.administrable &&
                    usuario.id !== identidad.id &&
                    puede("USERS.DISABLE") && (
                      <Button
                        disabled={pendiente}
                        size="sm"
                        variant="outline"
                        onClick={() => confirmar("estado", usuario)}
                      >
                        {usuario.estado === "ACTIVO" ? "Desactivar" : "Activar"}
                      </Button>
                    )}
                  {usuario.administrable && puede("USERS.RESET_PASSWORD") && (
                    <Button
                      disabled={pendiente}
                      size="sm"
                      variant="outline"
                      onClick={() => confirmar("password", usuario)}
                    >
                      Restablecer contraseña
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
