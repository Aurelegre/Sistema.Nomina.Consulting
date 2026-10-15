import assert from "node:assert/strict";
import { test } from "node:test";
import { validarEntorno } from "../scripts/runtime-env.mjs";
const base = {
  DATABASE_URL: "mysql://user:example@mysql.internal:3306/nomina",
  NODE_ENV: "production",
};
test("web exige origen HTTPS y puerto válido", () => {
  assert.throws(() => validarEntorno(base, "web"));
  assert.throws(() =>
    validarEntorno({ ...base, APP_URL: "http://nomina.example.com" }, "web"),
  );
  assert.throws(() =>
    validarEntorno(
      { ...base, APP_URL: "https://nomina.example.com/login" },
      "web",
    ),
  );
  assert.throws(() =>
    validarEntorno(
      { ...base, APP_URL: "https://nomina.example.com", PORT: "0" },
      "web",
    ),
  );
  assert.doesNotThrow(() =>
    validarEntorno(
      { ...base, APP_URL: "https://nomina.example.com", PORT: "8080" },
      "web",
    ),
  );
});
test("worker, migraciones y seed no necesitan .env ni URL pública", () => {
  for (const mode of ["worker", "migrate", "seed"])
    assert.doesNotThrow(() => validarEntorno(base, mode));
});
test("rechaza modo y conexión inválidos sin revelar credenciales", () => {
  assert.throws(() => validarEntorno(base, "otro"));
  assert.throws(
    () =>
      validarEntorno(
        { DATABASE_URL: "postgres://sensitive:secret@db/x" },
        "worker",
      ),
    (error) => {
      assert.ok(error instanceof Error);
      assert.ok(!error.message.includes("secret"));
      return true;
    },
  );
});
