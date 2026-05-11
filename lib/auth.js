// Credential storage. ~/.camp/credentials.json (mode 0600).

import { mkdir, readFile, writeFile, chmod, rm } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const DIR = path.join(homedir(), ".camp");
const FILE = path.join(DIR, "credentials.json");

export const credentialsPath = FILE;

export async function loadCredentials() {
  try {
    const raw = await readFile(FILE, "utf-8");
    const data = JSON.parse(raw);
    if (!data || typeof data.token !== "string" || typeof data.baseUrl !== "string") {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export async function saveCredentials(creds) {
  await mkdir(DIR, { recursive: true, mode: 0o700 });
  await writeFile(FILE, JSON.stringify(creds, null, 2), { mode: 0o600 });
  try { await chmod(FILE, 0o600); } catch { /* ignore */ }
}

export async function clearCredentials() {
  try { await rm(FILE, { force: true }); } catch { /* ignore */ }
}

export function isTokenExpired(creds) {
  if (!creds?.expiresAt) return false;
  return new Date(creds.expiresAt).getTime() < Date.now();
}
