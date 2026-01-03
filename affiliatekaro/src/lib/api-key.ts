import crypto from "node:crypto";

export function generateApiKey() {
  const raw = crypto.randomBytes(32).toString("base64url");
  return `ak_live_${raw}`;
}

export function hashApiKey(key: string) {
  return crypto.createHash("sha256").update(key, "utf8").digest("hex");
}

