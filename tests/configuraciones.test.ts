import assert from "node:assert/strict";
import { test } from "node:test";
import { prepararNomina } from "./helpers/nomina-fixture";
import {
  listarConfiguraciones,
  editarConfiguracion,
} from "../src/server/configuraciones/configuraciones.service";
import { iniciarSesion } from "../src/server/sesion/auth.service";
import { solicitarNomina } from "../src/server/nomina/nomina.service";
import { ejecutarPendientes } from "../src/server/nomina/nomina.worker";
void test("configuraciones, autorización y parámetros capturados por SP", async (t) => {
  const f = await prepararNomina();
  const { db, actor } = f;
  const cambiar = async (clave: string, valor: string) => {
    const c = await db.configuracion.findUniqueOrThrow({ where: { clave } });
    return editarConfiguracion(db, actor, {
      id: c.id,
      version: c.version,
      valor,
    });
  };
  try {
    await t.test("validación y versiones", async () => {
      assert.equal((await listarConfiguraciones(db, actor)).filas.length, 21);
      await assert.rejects(cambiar("igssLaboral", "101"));
      await assert.rejects(cambiar("sesionMinutos", "1.5"));
      await assert.rejects(cambiar("comisionLimite1", "300000"));
      const c = await db.configuracion.findUniqueOrThrow({
        where: { clave: "bonificacion" },
      });
      await cambiar("bonificacion", "300");
      await assert.rejects(
        editarConfiguracion(db, actor, {
          id: c.id,
          version: c.version,
          valor: "400",
        }),
        { code: "CONFLICT" },
      );
    });
    await t.test("sesión usa duración configurada", async () => {
      await cambiar("sesionMinutos", "30");
      const login = await iniciarSesion(db, f.usuario.username, f.password);
      assert.equal(login.sessionSeconds, 1800);
    });
    await t.test(
      "SP aplica captura aunque cambie configuración antes de ejecución",
      async () => {
        await cambiar("igssLaboral", "5");
        await cambiar("igssPatronal", "11");
        await cambiar("isrTasa1", "6");
        const { id } = await solicitarNomina(db, actor, {
          periodoId: f.periodo.id,
        });
        await cambiar("bonificacion", "400");
        await cambiar("igssLaboral", "8");
        await ejecutarPendientes(db);
        const d = await db.detalleNomina.findFirstOrThrow({
          where: { nominaId: id, empleadoId: f.empleado.id },
        });
        assert.equal(d.bonificacion.toFixed(2), "300.00");
        assert.equal(d.igssLaboral.toFixed(2), "300.00");
        assert.equal(d.igssPatronal.toFixed(2), "660.00");
        assert.equal(d.isr.toFixed(2), "104.88");
        assert.equal(
          (
            await db.periodoNomina.findUniqueOrThrow({
              where: { id: f.periodo.id },
            })
          ).estado,
          "CERRADO",
        );
      },
    );
    await t.test("consulta y edición exigen permisos vigentes", async () => {
      const rol = await db.rol.create({
        data: { codigo: f.prefijo, nombre: f.prefijo },
      });
      await db.usuario.update({
        where: { id: f.usuario.id },
        data: { rolId: rol.id },
      });
      await assert.rejects(listarConfiguraciones(db, actor), {
        code: "FORBIDDEN",
      });
      const view = await db.permiso.findUniqueOrThrow({
        where: { codigo: "SETTINGS.VIEW" },
      });
      await db.rolPermiso.create({
        data: { rolId: rol.id, permisoId: view.id },
      });
      assert.equal((await listarConfiguraciones(db, actor)).puedeEditar, false);
      await assert.rejects(cambiar("bonificacion", "500"), {
        code: "FORBIDDEN",
      });
    });
  } finally {
    await db.$disconnect();
  }
});
