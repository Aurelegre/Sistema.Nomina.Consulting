import type { Prisma, CodigoDepartamento } from "@prisma/client";

export const DEPARTAMENTOS_INICIALES: {
  codigo: CodigoDepartamento;
  nombre: string;
}[] = [
  { codigo: "FINANZAS", nombre: "Finanzas" },
  { codigo: "PRODUCCION", nombre: "Producción" },
  { codigo: "LOGISTICA", nombre: "Logística" },
  { codigo: "RECURSOS_HUMANOS", nombre: "Recursos Humanos" },
  { codigo: "MERCADEO", nombre: "Mercadeo" },
];

export async function prepararDepartamentos(db: Prisma.TransactionClient) {
  for (const departamento of DEPARTAMENTOS_INICIALES) {
    await db.departamento.upsert({
      where: { codigo: departamento.codigo },
      create: departamento,
      // Las cuentas y nombres configurados por el usuario se conservan.
      update: {},
    });
  }
}
