import { existsSync } from "node:fs";
import path from "node:path";
import { ok, fail, info, dim, cyan } from "../log.js";
import { which, spawnAgent, isWindows } from "../system.js";

/**
 * Spawn Claude Code or Codex in a workspace folder.
 *  npx @scaila/camp-cli agent                 → claude (없으면 codex)
 *  npx @scaila/camp-cli agent --codex         → codex
 *  npx @scaila/camp-cli agent --folder ./...  → 특정 폴더에서
 */
export default async function agent(args = {}) {
  const wantCodex = args.codex || args.tool === "codex";
  const wantClaude = args.claude || args.tool === "claude";

  const claudePath = which("claude");
  const codexPath = which("codex");

  let tool;
  if (wantCodex && !wantClaude) {
    if (!codexPath) {
      fail("Codex 가 설치돼 있지 않습니다.");
      console.log(`  ${dim("→")} ${cyan("npm install -g @openai/codex")}`);
      process.exit(1);
    }
    tool = "codex";
  } else if (wantClaude) {
    if (!claudePath) {
      fail("Claude Code 가 설치돼 있지 않습니다.");
      console.log(`  ${dim("→")} ${cyan("npm install -g @anthropic-ai/claude-code")}`);
      process.exit(1);
    }
    tool = "claude";
  } else {
    if (claudePath) tool = "claude";
    else if (codexPath) tool = "codex";
    else {
      fail("Claude Code 또는 Codex 가 필요합니다.");
      console.log(`  ${dim("Claude Code:")} ${cyan("npm install -g @anthropic-ai/claude-code")}`);
      console.log(`  ${dim("Codex:")}       ${cyan("npm install -g @openai/codex")}`);
      process.exit(1);
    }
  }

  const folder = args.folder ? path.resolve(args.folder) : process.cwd();
  if (!existsSync(folder)) {
    fail(`폴더 없음: ${folder}`);
    process.exit(1);
  }

  info(`${tool} 실행 → ${dim(folder)}${isWindows ? dim("  (Windows: shell-spawn)") : ""}`);
  console.log(`  ${dim("(에이전트 종료하면 다시 터미널로 돌아옵니다)")}`);
  console.log();

  const child = spawnAgent(tool, args._ || [], { cwd: folder });
  child.on("error", (err) => {
    fail(`${tool} 실행 실패: ${err.message}`);
    process.exit(1);
  });
  child.on("exit", (code) => {
    if (code === 0) ok(`${tool} 종료됨`);
    process.exit(code || 0);
  });
}
