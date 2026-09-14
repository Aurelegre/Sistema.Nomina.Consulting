import Link from "next/link";
import { Alert, AlertDescription } from "~/components/ui/alert";
export function SinAccesoView() {
  return (
    <main className="mx-auto max-w-xl space-y-4">
      <h2 className="text-2xl font-semibold">Acceso no autorizado</h2>
      <Alert>
        <AlertDescription>
          Tu cuenta no tiene permiso para consultar esta sección.
        </AlertDescription>
      </Alert>
      <Link className="underline" href="/">
        Volver al inicio
      </Link>
    </main>
  );
}
