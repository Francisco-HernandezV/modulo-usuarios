import crypto from "crypto";

export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function hashToken(token) {
  // usa sha256 para hash de token antes de guardarlo
  return crypto.createHash("sha256").update(token).digest("hex");
}
