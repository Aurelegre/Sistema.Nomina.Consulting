import { HealthCheck } from "~/app/_components/health-check";

const modules = [
  {
    title: "Períodos",
    description: "Administra los períodos mensuales de procesamiento de nómina.",
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

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-7xl">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
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
          <section
            key={module.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="font-semibold text-slate-950">{module.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {module.description}
            </p>
          </section>
        ))}
      </div>

      <div className="mt-6 w-fit rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
        <HealthCheck />
      </div>
    </main>
  );
}
