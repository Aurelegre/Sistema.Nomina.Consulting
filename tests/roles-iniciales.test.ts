import assert from "node:assert/strict";
import { test } from "node:test";
import { ROLES_INICIALES } from "../prisma/roles-iniciales";
import { PERMISOS } from "../src/server/permisos/Helpers/permisos";
const roles = new Map(ROLES_INICIALES.map((r) => [r.codigo, r]));
void test("plantillas válidas, únicas y sin administración de seguridad", () => {
  assert.equal(roles.size, 11);
  assert.equal(roles.size, ROLES_INICIALES.length);
  for (const r of roles.values()) {
    assert.match(r.codigo, /^[A-Z_]+$/);
    assert.equal(new Set(r.permisos).size, r.permisos.length);
    for (const p of r.permisos) {
      assert.ok(p in PERMISOS);
      assert.doesNotMatch(p, /^(USERS|ROLES|PERMISSIONS|SETTINGS)\./);
    }
  }
});
void test("cada jefe incluye los accesos del empleado de su área y su gestión departamental", () => {
  for (const area of [
    "RRHH",
    "PRODUCCION",
    "MERCADEO",
    "FINANZAS",
    "LOGISTICA",
  ]) {
    const jefe = roles.get("JEFE_" + area)!,
      empleado = roles.get("EMPLEADO_" + area)!;
    for (const p of empleado.permisos) assert.ok(jefe.permisos.includes(p));
    for (const p of [
      "DEPARTMENT_EMPLOYEES.VIEW",
      "DEPARTMENT_EMPLOYEES.DETAIL",
      "PAYROLL_NEWS.OVERTIME",
      "PAYROLL_NEWS.DOUBLE_TIME",
      "ABSENCES.APPROVE",
    ] as const)
      assert.ok(jefe.permisos.includes(p));
    assert.ok(!empleado.permisos.includes("ABSENCES.APPROVE"));
    assert.ok(!empleado.permisos.includes("DEPARTMENT_EMPLOYEES.VIEW"));
  }
});
void test("ventas, producción y procesamiento de nómina limitados al puesto responsable", () => {
  for (const r of roles.values()) {
    assert.equal(
      r.permisos.includes("PAYROLL_NEWS.PRODUCTION"),
      r.codigo === "JEFE_PRODUCCION",
    );
    assert.equal(
      r.permisos.includes("PAYROLL_NEWS.SALES"),
      r.codigo === "JEFE_MERCADEO",
    );
    assert.equal(
      r.permisos.includes("PAYROLL.PROCESS"),
      r.codigo === "JEFE_RRHH",
    );
  }
});
void test("auditor solo lectura; reportes exportables/generables exigen consulta", () => {
  for (const p of roles.get("AUDITOR")!.permisos)
    assert.match(p, /\.(VIEW|HISTORICAL_VIEW|DETAIL|EXPORT)$/);
  for (const r of roles.values())
    for (const p of r.permisos) {
      if (p.endsWith(".EXPORT") || p.endsWith(".GENERATE"))
        assert.ok(
          r.permisos.some(
            (v) => v === p.replace(/\.(EXPORT|GENERATE)$/, ".VIEW"),
          ),
        );
    }
  for (const area of ["LOGISTICA", "MERCADEO", "PRODUCCION"]) {
    const r = roles.get("EMPLEADO_" + area)!;
    assert.deepEqual(
      new Set(r.permisos),
      new Set(["ABSENCES.VIEW", "ABSENCES.CREATE"]),
    );
  }
});
