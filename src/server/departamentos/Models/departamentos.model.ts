import type { z } from "zod";
import type { editarDepartamentoSchema } from "./departamentos.schema";

export type EditarDepartamentoInput = z.infer<typeof editarDepartamentoSchema>;
