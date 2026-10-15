import { AusenciasView } from "~/features/ausencias/ausencias.view";
import { paginaAusencias } from "~/server/ausencias/Helpers/pagina-ausencias";
export default async function AusenciasPage() {
  return (
    <AusenciasView contextoInicial={await paginaAusencias()} ambito="propias" />
  );
}
