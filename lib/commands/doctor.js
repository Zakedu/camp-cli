import { DEFAULT_BASE_URL, recordEvent } from "../api.js";
import { ok, warn, fail, info, dim, bold, cyan } from "../log.js";
import { loadCredentials, isTokenExpired } from "../auth.js";
import { which, isMac, isWindows, osLabel } from "../system.js";

function box(title, lines) {
  console.log();
  console.log(`  ${bold(title)}`);
  for (const l of lines) console.log(`    ${l}`);
}

function hintNodeInstall() {
  box("→ Node.js 설치", [
    isMac
      ? `${cyan("권장 (Homebrew):")} brew install node`
      : isWindows
      ? `${cyan("권장:")} https://nodejs.org 에서 LTS 설치 후 터미널 다시 열기`
      : `${cyan("권장:")} https://nodejs.org 에서 LTS 다운로드`,
    dim("· 설치 후 터미널을 완전히 닫았다 다시 열어야 PATH가 반영됩니다."),
    dim("· 확인: node --version → v18 이상이어야 함"),
  ]);
}

function hintClaudeCodeInstall() {
  box("→ Claude Code 설치 (선택)", [
    `${cyan("npm 으로:")} npm install -g @anthropic-ai/claude-code`,
    isMac ? `${cyan("또는 Homebrew:")} brew install --cask claude-code` : "",
    `${cyan("공식 안내:")} https://docs.claude.com/claude-code/quickstart`,
    dim("· 설치 후 'claude' 명령으로 실행"),
  ].filter(Boolean));
}

function hintCodexInstall() {
  box("→ Codex CLI 설치 (선택)", [
    `${cyan("npm 으로:")} npm install -g @openai/codex`,
    `${cyan("공식 안내:")} https://github.com/openai/codex`,
    dim("· 설치 후 'codex' 명령으로 실행"),
    dim("· OpenAI API 키 설정 필요: codex auth login"),
  ]);
}

function hintNetwork(baseUrl) {
  box("→ 네트워크 문제 해결", [
    `${cyan("1.")} 인터넷 연결 확인 (다른 사이트 열리는지)`,
    `${cyan("2.")} 사내 VPN 사용 중이라면 끄고 재시도`,
    `${cyan("3.")} 회사 방화벽이 ${baseUrl} 막을 수 있음 — 운영팀에 문의`,
  ]);
}

export default async function doctor() {
  console.log();
  info("환경 점검");

  const problems = [];
  const suggestions = [];

  console.log(`  ${dim("OS:")} ${osLabel()}`);

  // Node version
  const major = Number(process.versions.node.split(".")[0]);
  if (major >= 18) {
    ok(`Node ${process.versions.node}`);
  } else {
    fail(`Node ${process.versions.node} — v18 이상 필요`);
    problems.push("node");
    suggestions.push(hintNodeInstall);
  }

  // Claude Code / Codex
  const claudePath = which("claude");
  const codexPath = which("codex");

  if (claudePath) ok(`Claude Code 감지: ${dim(claudePath)}`);
  else warn("Claude Code 없음");

  if (codexPath) ok(`Codex 감지: ${dim(codexPath)}`);
  else warn("Codex 없음");

  if (!claudePath && !codexPath) {
    console.log(`  ${dim("(Claude Code 와 Codex 둘 다 없어요. 자연어로 작업하려면 하나는 설치 권장.)")}`);
    problems.push("agent");
    suggestions.push(hintClaudeCodeInstall);
    suggestions.push(hintCodexInstall);
  } else {
    if (!claudePath) console.log(`  ${dim("(Claude Code 도 깔면 더 편해요. 둘 다 있어도 충돌 없음.)")}`);
    if (!codexPath) console.log(`  ${dim("(Codex 도 깔면 더 편해요. 둘 다 있어도 충돌 없음.)")}`);
  }

  // 서버 연결
  const baseUrl = (await loadCredentials())?.baseUrl || DEFAULT_BASE_URL;
  const t0 = Date.now();
  let networkOk = false;
  try {
    const res = await fetch(baseUrl, { method: "HEAD" });
    const ms = Date.now() - t0;
    if (res.ok || res.status === 405) {
      ok(`${baseUrl} 연결됨 (${ms}ms)`);
      networkOk = true;
    } else {
      warn(`${baseUrl} 응답 ${res.status} (${ms}ms)`);
    }
  } catch (err) {
    fail(`${baseUrl} 연결 실패: ${err.message}`);
    problems.push("network");
    suggestions.push(() => hintNetwork(baseUrl));
  }

  // 인증 상태
  const creds = await loadCredentials();
  if (!creds) {
    warn("로그인 안 됨");
    if (networkOk) {
      console.log(`  ${dim("→")} ${cyan("npx @scaila/camp-cli login")} ${dim("실행 (대시보드 [터미널] 탭에서 6자리 코드)")}`);
    }
  } else if (isTokenExpired(creds)) {
    fail(`토큰 만료 (${creds.expiresAt})`);
    console.log(`  ${dim("→")} ${cyan("npx @scaila/camp-cli login --force")} ${dim("로 재인증")}`);
  } else {
    ok(`토큰 유효 — ${dim(creds.studentName || "(이름 없음)")} · 만료 ${creds.expiresAt || "?"}`);
  }

  // 설치 안내 출력
  if (suggestions.length > 0) {
    console.log();
    console.log(`  ${bold("─ 설치 안내 ─")}`);
    for (const s of suggestions) s();
  }

  // 요약
  console.log();
  if (problems.length === 0) {
    ok("환경 OK. 다음 명령 추천:");
    if (!creds) console.log(`    ${cyan("npx @scaila/camp-cli login")}`);
    else console.log(`    ${cyan("npx @scaila/camp-cli status")}    또는    ${cyan("npx @scaila/camp-cli")} ${dim("(전체 마법사)")}`);
  } else {
    warn(`해결할 항목: ${problems.length}개  (${problems.join(", ")})`);
    console.log(`  ${dim("위 [설치 안내] 따라 진행 후 다시:")} ${cyan("npx @scaila/camp-cli doctor")}`);
  }

  await recordEvent("cli_doctor_ran", {
    node: process.versions.node,
    hasClaude: !!claudePath,
    hasCodex: !!codexPath,
    problems,
  });
}
