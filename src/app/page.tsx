import { HealthCheck } from "~/app/_components/health-check";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
        T3 + Prisma + MySQL
      </p>

      <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
        Starter listo para comenzar
      </h1>

      <p className="max-w-2xl text-lg leading-8 text-slate-600">
        Esta base contiene únicamente la infraestructura común. Agrega las
        features de negocio en ramas independientes.
      </p>

      <div className="w-fit rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
        <HealthCheck />
      </div>
    </main>
  );
}
