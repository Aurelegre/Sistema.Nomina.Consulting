"use client";
import Link from "next/link";
import { Alert, AlertDescription } from "~/components/ui/alert";
export function ErrorAcceso({ mensaje }: { mensaje?: string | null }) {
  return mensaje ? (
    <Alert variant="destructive">
      <AlertDescription>
        {mensaje === "UNAUTHORIZED" ? (
          <span>
            Tu sesión terminó.{" "}
            <Link href="/login" className="underline">
              Inicia sesión nuevamente
            </Link>
            .
          </span>
        ) : (
          mensaje
        )}
      </AlertDescription>
    </Alert>
  ) : null;
}
