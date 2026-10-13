import assert from "node:assert/strict";
import { test } from "node:test";
import { prepararNomina } from "./helpers/nomina-fixture";
import { cambiarPasswordPersonal } from "../src/server/sesion/password-personal.service";
import {
  iniciarSesion,
  cambiarPrimeraPassword,
} from "../src/server/sesion/auth.service";
import { verificarPassword } from "../src/server/sesion/Helpers/password";
void test("contraseña personal: validación, sesión y concurrencia", async (t) => {
  const f = await prepararNomina(),
    { db, actor } = f;
  const nueva = "Una clave personal nueva 123";
  const input = {
    passwordActual: f.password,
    nuevaPassword: nueva,
    confirmarPassword: nueva,
  };
  try {
    const rol = await db.rol.create({
      data: { codigo: f.prefijo + "_sin", nombre: "Sin permisos" },
    });
    await db.usuario.update({
      where: { id: f.usuario.id },
      data: { rolId: rol.id, empleadoId: null },
    });
    const original = await db.usuario.findUniqueOrThrow({
      where: { id: f.usuario.id },
    });
    await t.test(
      "rechaza entradas inválidas sin modificar la cuenta",
      async () => {
        for (const datos of [
          { ...input, confirmarPassword: "distinta" },
          { ...input, nuevaPassword: "corta", confirmarPassword: "corta" },
          {
            ...input,
            nuevaPassword: "x".repeat(129),
            confirmarPassword: "x".repeat(129),
          },
          {
            ...input,
            nuevaPassword: f.password,
            confirmarPassword: f.password,
          },
          { ...input, passwordActual: "incorrecta" },
          { ...input, usuarioId: 999 },
        ]) {
          await assert.rejects(cambiarPasswordPersonal(db, actor, datos));
        }
        assert.equal(
          (await db.usuario.findUniqueOrThrow({ where: { id: f.usuario.id } }))
            .passwordHash,
          original.passwordHash,
        );
      },
    );
    await t.test(
      "sesión inválida y cuenta desactivada no pueden cambiar",
      async () => {
        await assert.rejects(
          cambiarPasswordPersonal(db, { ...actor, sesionId: 999999 }, input),
        );
        await db.usuario.update({
          where: { id: f.usuario.id },
          data: { estado: "INACTIVO" },
        });
        await assert.rejects(cambiarPasswordPersonal(db, actor, input));
        await db.usuario.update({
          where: { id: f.usuario.id },
          data: { estado: "ACTIVO" },
        });
      },
    );
    await t.test(
      "dos solicitudes concurrentes: una sola cambia y revoca todas las sesiones",
      async () => {
        await iniciarSesion(db, f.usuario.username, f.password);
        const r = await Promise.allSettled([
          cambiarPasswordPersonal(db, actor, input),
          cambiarPasswordPersonal(db, actor, input),
        ]);
        assert.equal(r.filter((v) => v.status === "fulfilled").length, 1);
        assert.equal(
          await db.sesion.count({ where: { usuarioId: f.usuario.id } }),
          0,
        );
        const usuario = await db.usuario.findUniqueOrThrow({
          where: { id: f.usuario.id },
        });
        assert.ok(await verificarPassword(usuario.passwordHash, nueva));
        assert.equal(usuario.rolId, rol.id);
        assert.equal(usuario.nombre, original.nombre);
        assert.equal(usuario.debeCambiarPassword, false);
        await assert.rejects(iniciarSesion(db, f.usuario.username, f.password));
        assert.ok((await iniciarSesion(db, f.usuario.username, nueva)).token);
        await assert.rejects(cambiarPasswordPersonal(db, actor, input));
      },
    );
    await t.test(
      "el flujo de contraseña temporal sigue funcionando",
      async () => {
        await db.usuario.update({
          where: { id: f.usuario.id },
          data: { debeCambiarPassword: true },
        });
        await cambiarPrimeraPassword(
          db,
          f.usuario.id,
          nueva,
          "Otra clave temporal cambiada 456",
        );
        assert.equal(
          (await db.usuario.findUniqueOrThrow({ where: { id: f.usuario.id } }))
            .debeCambiarPassword,
          false,
        );
      },
    );
  } finally {
    await db.$disconnect();
  }
});
