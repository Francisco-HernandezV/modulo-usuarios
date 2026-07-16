import crypto from "node:crypto";


export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// PIN_PEPPER debe estar en el .env y NUNCA cambiar (si cambia, se invalidan todos los PIN).
export function hashPin(pin) {
  const pepper = process.env.PIN_PEPPER;
  if (!pepper) throw new Error("Falta PIN_PEPPER en el entorno");
  return crypto.createHmac("sha256", pepper).update(String(pin)).digest("hex");
}