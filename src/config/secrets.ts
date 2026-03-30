import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";

import { getConfigDir, getSecretsPath } from "./paths.js";
import type { ProviderName } from "../types.js";

interface SecretStore {
  providerApiKeys: Partial<Record<ProviderName, string>>;
}

interface EncryptedSecretFile {
  version: 1;
  salt: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

const defaultSecretStore: SecretStore = {
  providerApiKeys: {}
};

function getEncryptionPassword(): string {
  return process.env.CLILY_SECRET_KEY
    ?? [
      "clily-local-secret-store",
      os.hostname(),
      os.homedir(),
      os.userInfo().username,
      process.platform
    ].join("|");
}

function encryptSecretStore(data: SecretStore): EncryptedSecretFile {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(getEncryptionPassword(), salt, 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = JSON.stringify(data);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    version: 1,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64")
  };
}

function decryptSecretStore(payload: EncryptedSecretFile): SecretStore {
  const salt = Buffer.from(payload.salt, "base64");
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");
  const key = scryptSync(getEncryptionPassword(), salt, 32);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  const parsed = JSON.parse(plaintext) as SecretStore;
  return {
    providerApiKeys: parsed.providerApiKeys ?? {}
  };
}

async function readSecretStore(): Promise<SecretStore> {
  try {
    const raw = await fs.readFile(getSecretsPath(), "utf8");
    const payload = JSON.parse(raw) as EncryptedSecretFile;
    return decryptSecretStore(payload);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return defaultSecretStore;
    }

    throw new Error(
      "Stored secrets could not be decrypted. If you moved this config from another machine, set CLILY_SECRET_KEY to the original value or run `clily setup` again."
    );
  }
}

async function writeSecretStore(store: SecretStore): Promise<void> {
  await fs.mkdir(getConfigDir(), { recursive: true });
  const payload = encryptSecretStore(store);
  await fs.writeFile(getSecretsPath(), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export async function getProviderApiKey(provider: ProviderName): Promise<string | undefined> {
  const store = await readSecretStore();
  return store.providerApiKeys[provider];
}

export async function setProviderApiKey(provider: ProviderName, apiKey: string): Promise<void> {
  const store = await readSecretStore();
  store.providerApiKeys[provider] = apiKey;
  await writeSecretStore(store);
}
