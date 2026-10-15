import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { buttonVariants } from "~/components/ui/button";
import { ANY_PERMISOS_RUTAS, PERMISOS_RUTAS } from "~/shared/permisos-rutas";

const accesos = [
  {
    href: "/mi-nomina",
    title: "Mi nómina",
    description: "Consulta tus nóminas anteriores y su detalle.",
  },
  {
    href: "/ausencias",
    title: "Mis ausencias",
    description: "Consulta y gestiona tus solicitudes de ausencia.",
  },
  {
    href: "/mi-departamento",
    title: "Mi departamento",
    description: "Accede a los empleados y novedades de tu departamento.",
  },
  {
    href: "/empleados",
    title: "Empleados",
    description: "Abre la administración de empleados.",
  },
  {
    href: "/periodos",
    title: "Períodos",
    description: "Consulta los períodos de trabajo de nómina.",
  },
  {
    href: "/nomina",
    title: "Nómina",
    description: "Accede a la generación y consulta de nóminas.",
  },
  {
    href: "/asociacion/compras",
    title: "Compras solidarias",
    description: "Consulta y administra los registros de compras.",
  },
  {
    href: "/reportes",
    title: "Reportes",
    description: "Accede a los reportes disponibles para tu cuenta.",
  },
  {
    href: "/mi-password",
    title: "Cambiar contraseña",
    description: "Actualiza la contraseña de tu cuenta.",
  },
];

type InicioProps = {
  permisos: string[];
  empleadoId: number | null;
  esJefeDepartamento: boolean;
};
export function InicioView({
  permisos,
  empleadoId,
  esJefeDepartamento,
}: InicioProps) {
  const disponibles = accesos.filter(({ href }) => {
    if (href === "/mi-password") return true;
    if (href === "/mi-nomina") return empleadoId !== null;
    if (href === "/ausencias" && empleadoId === null) return false;
    if (href === "/mi-departamento" && !esJefeDepartamento) return false;
    const permiso = PERMISOS_RUTAS[href];
    if (permiso) return permisos.includes(permiso);
    return ANY_PERMISOS_RUTAS[href]?.some((p) => permisos.includes(p)) ?? false;
  });
  return (
    <main className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight">Bienvenido</h2>
        <p className="text-muted-foreground max-w-2xl">
          Selecciona un acceso para continuar con tus actividades. También
          puedes explorar las opciones del menú lateral.
        </p>
      </div>
      <section aria-labelledby="accesos-title" className="space-y-4">
        <h3 id="accesos-title" className="text-lg font-semibold">
          Accesos directos
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {disponibles.map((acceso) => (
            <Card key={acceso.href} className="flex flex-col">
              <CardHeader>
                <CardTitle>
                  <h4>{acceso.title}</h4>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col items-start gap-5">
                <p className="text-muted-foreground flex-1 text-sm leading-6">
                  {acceso.description}
                </p>
                <Link
                  href={acceso.href}
                  className={buttonVariants({ variant: "outline" })}
                  aria-label={`Abrir ${acceso.title}`}
                >
                  Abrir <ArrowRight aria-hidden="true" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
