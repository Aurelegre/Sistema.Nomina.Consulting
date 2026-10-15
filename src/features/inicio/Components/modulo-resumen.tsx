import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { ModuloResumen } from "../Models/moduloResumen.model";

export function ModuloResumenCard({ title, description }: ModuloResumen) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>{title}</h3>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm leading-6">{description}</p>
      </CardContent>
    </Card>
  );
}
