import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

const handler = (req: NextRequest) => {
  // Origin explícito para evitar que una página externa use la cookie de sesión.
  if (
    req.method === "POST" &&
    req.headers.get("origin") !== new URL(env.APP_URL).origin
  ) {
    return new Response("Origen no permitido", { status: 403 });
  }
  const responseHeaders = new Headers({ "Cache-Control": "no-store" });
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () =>
      createTRPCContext({ headers: req.headers, responseHeaders }),
    responseMeta: () => ({ headers: responseHeaders }),
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) =>
            console.error(
              `tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            )
        : undefined,
  });
};

export { handler as GET, handler as POST };
