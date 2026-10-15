"use client";
import { useState } from "react";
export function useAccionAcceso() {
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  async function ejecutar(accion: () => Promise<void>) {
    if (pendiente) return;
    setPendiente(true);
    setError(null);
    setMensaje(null);
    try {
      await accion();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo completar la operación",
      );
    } finally {
      setPendiente(false);
    }
  }
  return { pendiente, error, mensaje, setError, setMensaje, ejecutar };
}
