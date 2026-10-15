"use client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
export function Selector({
  etiqueta,
  valor,
  opciones,
  onChange,
  disabled,
}: {
  etiqueta: string;
  valor: string;
  opciones: { value: string; label: string }[];
  onChange: (valor: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={valor}
      items={opciones}
      onValueChange={(value) => onChange(value ?? "")}
      disabled={disabled}
    >
      <SelectTrigger aria-label={etiqueta} className="w-full min-w-40">
        <SelectValue placeholder={etiqueta} />
      </SelectTrigger>
      <SelectContent>
        {opciones.map((opcion) => (
          <SelectItem key={opcion.value} value={opcion.value}>
            {opcion.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
