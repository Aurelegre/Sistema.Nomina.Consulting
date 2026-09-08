import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { seed } from "../prisma/seed";
import { PERMISOS } from "../src/shared/permisos";
import {
  iniciarSesion,
  obtenerSesion,
  cambiarPrimeraPassword,
  cookieSesion,
} from "../src/server/services/auth.service";
import { createCaller } from "../src/server/api/root";

void test("seed repetible y ciclo de contraseña inicial, sesión y permisos", async () => {
  const db = new PrismaClient();
  const username = `test_auth_${randomBytes(6).toString("hex")}`;
  const temporal = randomBytes(24).toString("base64");
  const definitiva = randomBytes(24).toString("base64");
  let rolPruebaId: number | undefined;
  const caller = async (token?: string) => {
    const headers = new Headers(
      token ? { cookie: cookieSesion(token) } : undefined,
    );
    return createCaller({
      db,
      headers,
      responseHeaders: new Headers(),
      sesion: await obtenerSesion(db, headers),
    });
  };
  try {
    await seed(db, { username, password: temporal });
    const usuario = await db.usuario.findUniqueOrThrow({
      where: { username },
      include: {
        rol: { include: { permisos: { include: { permiso: true } } } },
      },
    });
    assert.equal(usuario.debeCambiarPassword, true);
    assert.notEqual(usuario.passwordHash, temporal);
    assert.deepEqual(
      new Set(usuario.rol.permisos.map(({ permiso }) => permiso.codigo)),
      new Set(Object.keys(PERMISOS)),
    );
    await seed(db, { username, password: definitiva });
    assert.equal(
      (await db.usuario.findUniqueOrThrow({ where: { username } }))
        .passwordHash,
      usuario.passwordHash,
    );
    await assert.rejects((await caller()).periodosNomina.listar(), {
      code: "UNAUTHORIZED",
    });
    await assert.rejects(iniciarSesion(db, username, definitiva), {
      code: "UNAUTHORIZED",
    });
    const inicial = await iniciarSesion(db, username, temporal);
    assert.equal(inicial.debeCambiarPassword, true);
    await assert.rejects(
      (await caller(inicial.token)).periodosNomina.listar(),
      { code: "FORBIDDEN" },
    );
    await assert.rejects(
      cambiarPrimeraPassword(db, usuario.id, temporal, temporal),
      { code: "BAD_REQUEST" },
    );
    await assert.rejects(
      cambiarPrimeraPassword(db, usuario.id, definitiva, definitiva),
      { code: "BAD_REQUEST" },
    );
    await cambiarPrimeraPassword(db, usuario.id, temporal, definitiva);
    assert.equal(
      await obtenerSesion(
        db,
        new Headers({ cookie: cookieSesion(inicial.token) }),
      ),
      null,
    );
    const actualizado = await db.usuario.findUniqueOrThrow({
      where: { username },
    });
    assert.equal(actualizado.debeCambiarPassword, false);
    await seed(db, { username });
    const conservado = await db.usuario.findUniqueOrThrow({
      where: { username },
    });
    assert.equal(conservado.passwordHash, actualizado.passwordHash);
    assert.equal(conservado.debeCambiarPassword, false);
    await assert.rejects(iniciarSesion(db, username, temporal), {
      code: "UNAUTHORIZED",
    });
    const normal = await iniciarSesion(db, username, definitiva);
    await (await caller(normal.token)).periodosNomina.listar();
    await (await caller(normal.token)).auth.logout();
    assert.equal(
      await obtenerSesion(
        db,
        new Headers({ cookie: cookieSesion(normal.token) }),
      ),
      null,
    );
    const expirada = await iniciarSesion(db, username, definitiva);
    await db.sesion.updateMany({
      where: { usuarioId: usuario.id },
      data: { fechaExpiracion: new Date(0) },
    });
    assert.equal(
      await obtenerSesion(
        db,
        new Headers({ cookie: cookieSesion(expirada.token) }),
      ),
      null,
    );
    const rol = await db.rol.create({
      data: { codigo: username, nombre: username },
    });
    rolPruebaId = rol.id;
    await db.usuario.update({
      where: { id: usuario.id },
      data: { rolId: rol.id },
    });
    const limitado = await iniciarSesion(db, username, definitiva);
    await assert.rejects(
      (await caller(limitado.token)).periodosNomina.listar(),
      { code: "FORBIDDEN" },
    );
    await db.rol.update({
      where: { id: rol.id },
      data: { estado: "INACTIVO" },
    });
    assert.equal(
      await obtenerSesion(
        db,
        new Headers({ cookie: cookieSesion(limitado.token) }),
      ),
      null,
    );
    await assert.rejects(iniciarSesion(db, username, definitiva), {
      code: "UNAUTHORIZED",
    });
    await db.rol.update({ where: { id: rol.id }, data: { estado: "ACTIVO" } });
    await db.usuario.update({
      where: { id: usuario.id },
      data: { estado: "INACTIVO" },
    });
    await assert.rejects(iniciarSesion(db, username, definitiva), {
      code: "UNAUTHORIZED",
    });
    await db.intentoLogin.deleteMany({ where: { username } });
    for (let i = 0; i < 5; i++)
      await assert.rejects(iniciarSesion(db, username, temporal), {
        code: "UNAUTHORIZED",
      });
    await assert.rejects(iniciarSesion(db, username, temporal), {
      code: "TOO_MANY_REQUESTS",
    });
  } finally {
    await db.usuario.deleteMany({ where: { username } });
    await db.intentoLogin.deleteMany({ where: { username } });
    if (rolPruebaId) await db.rol.delete({ where: { id: rolPruebaId } });
    await db.$disconnect();
  }
});
