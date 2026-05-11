import { execSync } from "node:child_process";
import { DEFAULT_BASE_URL, recordEvent } from "../api.js";
import { ok, warn, fail, info, dim } from "../log.js";
import { loadCredentials, isTokenExpired } from "../auth.js";

function which(cmd) {
  try {
    const out = execSync(`command -v ${cmd}`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString().trim();
    return out || null;
  } catch {
    return null;
  }
}

export default async function doctor() {
  console.log();
  info("환경 점검");

  const major = Number(process.versions.node.split(".")[0]);
  if (major >= 18) ok(`Node ${process.versions.node}`);
  else fail(`Node ${process.versions.node} — v18 이상 필요. nodejs.org 에서 LTS 설치 후 터미널 재시작.`);

  const claudePath = which("claude");
  const codexPath = which("codex");
  if (claudePath || codexPath) {
    if (claudePath) ok(`Claude Code 감지: ${dim(claudePath)}`);
    if (codexPath) ok(`Codex 감지: ${dim(codexPath)}`);
    if (!claudePath) warn("Claude Code 없음 — Codex 만으로도 OK");
    if (!codexPath) warn("Codex 없음 — Claude Code 만으로도 OK");
  } else {
    warn("Claude Code / Codex 둘 다 없음 (선택 사항이지만 권장)");
  }

  const baseUrl = (await loadCredentials())?.baseUrl || DEFAULT_BASE_URL;
  const t0 = Date.now();
  try {
    const res = await fetch(baseUrl, { method: "HEAD" });
    const ms = Date.now() - t0;
    if (res.ok || res.status === 405) ok(`${baseUrl} 연결됨 (${ms}ms)`);
    else warn(`${baseUrl} 응답 ${res.status} (${ms}ms)`);
  } catch (err) {
    fail(`${baseUrl} 연결 실패: ${err.message}`);
  }

  const creds = await loadCredentials();
  if (!creds) {
    warn("로그인 안 됨 — `npx @scaila/camp-cli login`");
  } else if (isTokenExpired(creds)) {
    fail(`토큰 만료 (${creds.expiresAt}) — 재로그인 필요`);
  } else {
    ok(`토큰 유효 — 만료 ${creds.expiresAt || "정보 없음"}`);
  }

  await recordEvent("cli_doctor_ran", { node: process.versions.node, hasClaude: !!claudePath, hasCodex: !!codexPath });
}
