import { prepararNomina } from "./nomina-fixture";
export async function prepararCumpleaneros() {
  const f = await prepararNomina();
  await f.db.periodoNomina.delete({ where: { id: f.periodo.id } });
  const otro = await f.db.departamento.create({
    data: {
      codigo: f.prefijo + "_otro",
      nombre: "Departamento secundario",
      estado: "INACTIVO",
    },
  });
  const crear = (
    codigo: string,
    nombre: string,
    fecha: string,
    estado: "ACTIVO" | "INACTIVO",
    departamentoId = f.departamento.id,
  ) =>
    f.db.empleado.create({
      data: {
        codigo: f.prefijo + "_" + codigo,
        nombre,
        fechaNacimiento: new Date(fecha),
        fechaIngreso: new Date("2020-01-01"),
        salarioBase: 6000,
        estado,
        departamentoId,
      },
    });
  const ana = await crear("ana", "Ana de prueba", "1992-02-05", "ACTIVO");
  const zoe = await crear(
    "zoe",
    "Zoe de prueba",
    "1990-02-05",
    "ACTIVO",
    otro.id,
  );
  const bisiesto = await crear(
    "bis",
    "Empleado bisiesto",
    "2000-02-29",
    "INACTIVO",
  );
  return { ...f, otro, ana, zoe, bisiesto };
}
