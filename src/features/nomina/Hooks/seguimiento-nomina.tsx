"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "~/trpc/react";
import type { Salidas } from "~/shared/Models/acceso.model";

type Aviso = Salidas["nomina"]["seguimiento"];
const SeguimientoContext = createContext<{
  iniciar: (id: number) => Promise<void>;
  cancelar: () => void;
  aviso: Aviso | null;
  descartar: () => void;
} | null>(null);

export function SeguimientoNominaProvider({
  sesionId,
  children,
}: {
  sesionId: number;
  children: React.ReactNode;
}) {
  const utils = api.useUtils();
  const clave = `nomina-en-curso:${sesionId}`;
  const [id, setId] = useState<number | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  // Only this browser tab and initiating login may resume a running request.
  // A different login never restores the previous session's notification.
  useEffect(() => {
    const guardado = Number(sessionStorage.getItem(clave));
    if (Number.isSafeInteger(guardado) && guardado > 0) setId(guardado);
  }, [clave]);
  const consulta = api.nomina.seguimiento.useQuery(
    { id: id ?? 0 },
    {
      enabled: id !== null,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: (query) =>
        query.state.error ||
        ["COMPLETADA", "FALLIDA"].includes(query.state.data?.estado ?? "")
          ? false
          : 3000,
    },
  );
  useEffect(() => {
    if (id === null) return;
    const finalizada =
      consulta.data && ["COMPLETADA", "FALLIDA"].includes(consulta.data.estado);
    if (finalizada || consulta.error) {
      if (finalizada && !consulta.error) setAviso(consulta.data);
      sessionStorage.removeItem(clave);
      setId(null);
    }
  }, [consulta.data, consulta.error, id, clave]);
  const cancelar = () => {
    sessionStorage.removeItem(clave);
    setId(null);
    setAviso(null);
    void utils.nomina.seguimiento.cancel();
  };
  const iniciar = async (nuevoId: number) => {
    // A failed generation may reuse the same ID; discard its old terminal state.
    await utils.nomina.seguimiento.reset({ id: nuevoId });
    sessionStorage.setItem(clave, String(nuevoId));
    setAviso(null);
    setId(nuevoId);
  };
  return (
    <SeguimientoContext.Provider
      value={{ iniciar, cancelar, aviso, descartar: () => setAviso(null) }}
    >
      {children}
    </SeguimientoContext.Provider>
  );
}

export function useSeguimientoNomina() {
  const contexto = useContext(SeguimientoContext);
  if (!contexto)
    throw new Error("El seguimiento requiere una sesión administrativa.");
  return contexto;
}
