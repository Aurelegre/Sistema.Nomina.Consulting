"use client";

import { useEffect, useRef } from "react";

type ConfirmarCierrePeriodoModalProps = {
  abierto: boolean;
  periodo: string;
  procesando: boolean;
  error?: string;
  onCancelar: () => void;
  onConfirmar: () => void;
};

export function ConfirmarCierrePeriodoModal({
  abierto,
  periodo,
  procesando,
  error,
  onCancelar,
  onConfirmar,
}: ConfirmarCierrePeriodoModalProps) {
  const confirmarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !procesando) {
        onCancelar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    confirmarRef.current?.focus();

    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [abierto, onCancelar, procesando]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !procesando) {
          onCancelar();
        }
      }}
    >
      <div
        aria-describedby="cerrar-periodo-descripcion"
        aria-labelledby="cerrar-periodo-titulo"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
      >
        <div className="mb-5">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-xl text-amber-700">
            !
          </div>

          <h2
            className="text-xl font-semibold text-slate-950"
            id="cerrar-periodo-titulo"
          >
            Cerrar período de nómina
          </h2>

          <p
            className="mt-2 text-sm leading-6 text-slate-600"
            id="cerrar-periodo-descripcion"
          >
            Vas a cerrar <strong>{periodo}</strong>. Después del cierre no se
            podrán registrar nuevas novedades ni modificar la información
            operativa asociada a este período.
          </p>
        </div>

        {error ? (
          <div
            className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={procesando}
            onClick={onCancelar}
          >
            Cancelar
          </button>

          <button
            ref={confirmarRef}
            className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={procesando}
            onClick={onConfirmar}
          >
            {procesando ? "Cerrando..." : "Confirmar cierre"}
          </button>
        </div>
      </div>
    </div>
  );
}
