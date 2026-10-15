"use client";

import { useSyncExternalStore } from "react";
const suscribir = () => () => undefined;
const cliente = () => true;
const servidor = () => false;

export function useHidratado() {
  return useSyncExternalStore(suscribir, cliente, servidor);
}
