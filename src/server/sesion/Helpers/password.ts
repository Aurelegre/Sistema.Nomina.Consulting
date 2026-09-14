import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(12, "Usa al menos 12 caracteres")
  .max(128);

export function hashPassword(password: string) {
  return hash(passwordSchema.parse(password), {
    algorithm: 2, // Argon2id; el paquete declara Algorithm como const enum.
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export function verificarPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password);
}
