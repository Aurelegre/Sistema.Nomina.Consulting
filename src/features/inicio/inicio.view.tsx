import { HealthCheck } from "~/features/inicio/Components/health-check";
import { Card, CardContent } from "~/components/ui/card";
import { ModuloResumenCard } from "./Components/modulo-resumen";

const modules = [
  {
    title: "Períodos",
    description:
      "Administra los períodos mensuales de procesamiento de nómina.",
  },
  {
    title: "Empleados",
    description: "Gestiona la información laboral y salarial de los empleados.",
  },
  {
    title: "Nómina",
    description: "Procesa ingresos, egresos, anticipos y pago de fin de mes.",
  },
  {
    title: "Reportes",
    description: "Consulta IGSS, ISR, póliza contable y libro de salarios.",
  },
];

export function InicioView() {
  return (
    <main className="mx-auto max-w-7xl">
      <div className="mb-8">
        <p className="text-sm font-medium tracking-wider text-slate-500 uppercase">
          Sistema de Nómina
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Panel principal
        </h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          Accede a los módulos operativos y administrativos de Consulting, S.A.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {modules.map((module) => (
          <ModuloResumenCard key={module.title} {...module} />
        ))}
      </div>

      <Card className="mt-6 w-fit">
        <CardContent>
          <HealthCheck />
        </CardContent>
      </Card>
    </main>
  );
}
