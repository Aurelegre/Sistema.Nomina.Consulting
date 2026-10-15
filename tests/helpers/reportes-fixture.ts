import { prepararNomina } from "./nomina-fixture";
import { solicitarNomina } from "../../src/server/nomina/nomina.service";
import { ejecutarPendientes } from "../../src/server/nomina/nomina.worker";

export async function prepararReporte() {
  const f = await prepararNomina();
  await f.db.departamento.update({
    where: { id: f.departamento.id },
    data: { cuentaContable: "001-5101" },
  });
  await f.db.compraSolidaria.create({
    data: {
      empleadoId: f.empleado.id,
      periodoId: f.periodo.id,
      usuarioRegistroId: f.usuario.id,
      monto: 9000,
      detalle: "Compra para verificar resultado negativo",
    },
  });
  await solicitarNomina(f.db, f.actor, { periodoId: f.periodo.id });
  await ejecutarPendientes(f.db);
  return f;
}
