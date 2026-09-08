import { notFound } from "next/navigation";

const MODULOS: Record<string, { titulo: string; descripcion: string }> = {
  empleados: {
    titulo: "Empleados",
    descripcion: "Gestión de empleados, datos laborales y salarios.",
  },
  departamentos: {
    titulo: "Departamentos",
    descripcion: "Administración de departamentos y cuentas contables.",
  },
  periodos: {
    titulo: "Períodos de nómina",
    descripcion: "Administración de períodos mensuales de nómina.",
  },
  nomina: {
    titulo: "Nómina",
    descripcion: "Procesamiento de ingresos, egresos, anticipos y pago final.",
  },
  ausencias: {
    titulo: "Ausencias",
    descripcion: "Registro, aprobación y aplicación de ausencias.",
  },
  asociacion: {
    titulo: "Asociación Solidarista",
    descripcion: "Ahorro solidarista y compras financiadas.",
  },
  reportes: {
    titulo: "Reportes",
    descripcion: "IGSS, ISR, póliza contable y libro de salarios.",
  },
  usuarios: {
    titulo: "Usuarios",
    descripcion: "Usuarios, roles y permisos del sistema.",
  },
  configuracion: {
    titulo: "Configuración",
    descripcion: "Parámetros generales y reglas configurables de nómina.",
  },
};

export default async function ModuloPendientePage({
  params,
}: {
  params: Promise<{ modulo: string }>;
}) {
  const { modulo } = await params;
  const informacion = MODULOS[modulo];

  if (!informacion) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-7xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
          Módulo
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          {informacion.titulo}
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          {informacion.descripcion}
        </p>

        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6">
          <p className="text-sm font-medium text-slate-700">
            Este módulo será implementado en su feature correspondiente.
          </p>
        </div>
      </div>
    </main>
  );
}
