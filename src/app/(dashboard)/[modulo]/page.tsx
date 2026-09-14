import { ModuloPendienteView } from "~/components/navigation/modulo-pendiente-view";
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

  return <ModuloPendienteView informacion={informacion} />;
}
