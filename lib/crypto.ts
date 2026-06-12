// API anahtarları veritabanında asla düz metin tutulmaz.
// AES-256-GCM ile şifrelenir. Anahtar: APP_ENCRYPTION_KEY (.env)
import crypto from "crypto";

function key(): Buffer {
  const k = process.env.APP_ENCRYPTION_KEY || "";
  if (k.length >= 64) return Buffer.from(k.slice(0, 64), "hex");
  // geliştirme kolaylığı: kısa anahtarları sha256 ile genişlet
  return crypto.createHash("sha256").update(k || "engrace-dev-key").digest();
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${tag.toString("hex")}.${enc.toString("hex")}`;
}

export function decrypt(payload: string): string {
  if (!payload) return "";
  const [ivH, tagH, dataH] = payload.split(".");
  if (!ivH || !tagH || !dataH) return "";
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivH, "hex"));
  decipher.setAuthTag(Buffer.from(tagH, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataH, "hex")), decipher.final()]).toString("utf8");
}
