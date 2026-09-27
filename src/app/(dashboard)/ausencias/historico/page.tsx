import { AusenciasView } from "~/features/ausencias/ausencias.view";
import { paginaHistorial } from "~/server/ausencias/Helpers/pagina-historial";

export default async function RevisionAusenciasPage() {
  return (
    <AusenciasView
      contextoInicial={await paginaHistorial(true)}
      ambito="todos"
    />
  );
}
