import {
  createCipheriv,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function getEncryptionKey() {
  const configuredKey = process.env.WALLET_ENCRYPTION_KEY;

  if (!configuredKey) {
    throw new Error("WALLET_ENCRYPTION_KEY is required to create deposit wallets");
  }

  const key = Buffer.from(configuredKey, "base64");

  if (key.length !== KEY_LENGTH) {
    throw new Error("WALLET_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }

  return key;
}

export function encryptSecretKey(secretKey: string) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(secretKey, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}
