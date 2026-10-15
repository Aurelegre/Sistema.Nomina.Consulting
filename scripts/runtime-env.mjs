/**
 * Validate deployment inputs without logging credentials.
 * @param {Record<string, string | undefined>} values
 * @param {string} mode
 */
export function validarEntorno(values, mode) {
  if (!["web", "worker", "migrate", "seed"].includes(mode))
    throw new Error("Modo inválido: web, worker, migrate o seed.");
  let database;
  try {
    database = new URL(values.DATABASE_URL ?? "");
  } catch {
    throw new Error("Configura DATABASE_URL con la conexión privada de MySQL.");
  }
  if (
    database.protocol !== "mysql:" ||
    !database.hostname ||
    database.pathname.length < 2
  )
    throw new Error("DATABASE_URL debe identificar una base MySQL.");
  if (mode === "web") {
    let app;
    try {
      app = new URL(values.APP_URL ?? "");
    } catch {
      throw new Error(
        "Configura APP_URL con el origen público de la aplicación.",
      );
    }
    if (
      !["http:", "https:"].includes(app.protocol) ||
      app.username ||
      app.password ||
      app.pathname !== "/" ||
      app.search ||
      app.hash
    )
      throw new Error(
        "APP_URL debe ser un origen HTTP(S), sin ruta ni credenciales.",
      );
    if (values.NODE_ENV === "production" && app.protocol !== "https:")
      throw new Error("APP_URL debe utilizar HTTPS en producción.");
    if (
      values.PORT &&
      (!/^\d+$/.test(values.PORT) ||
        Number(values.PORT) < 1 ||
        Number(values.PORT) > 65535)
    )
      throw new Error("PORT debe ser un puerto válido.");
  }
}
