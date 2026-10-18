import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Cifra el secreto de la integración antes de guardarlo — nunca se
// persiste en texto plano, y solo se descifra en memoria dentro de
// syncToCRM/testCrmIntegration. INTEGRATIONS_ENC_KEY son 32 bytes en
// base64 (nunca NEXT_PUBLIC_, solo server-side).
const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.INTEGRATIONS_ENC_KEY;
  if (!raw) throw new Error("Falta INTEGRATIONS_ENC_KEY en el entorno.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("INTEGRATIONS_ENC_KEY debe ser 32 bytes en base64.");
  return key;
}

export function encrypt(plain: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decrypt(packed: string): string {
  const key = getKey();
  const [ivB64, tagB64, ciphertextB64] = packed.split(":");
  if (!ivB64 || !tagB64 || !ciphertextB64) throw new Error("Secreto cifrado con formato inválido.");
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plain = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, "base64")), decipher.final()]);
  return plain.toString("utf8");
}
