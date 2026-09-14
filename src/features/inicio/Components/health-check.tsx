"use client";

import { api } from "~/trpc/react";

export function HealthCheck() {
  const health = api.health.check.useQuery();

  if (health.isPending) return <span>Verificando tRPC...</span>;
  if (health.isError) return <span>tRPC no disponible</span>;

  return (
    <span>
      tRPC: {health.data.status} · {health.data.timestamp.toLocaleString()}
    </span>
  );
}
