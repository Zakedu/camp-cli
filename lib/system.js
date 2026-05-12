// Cross-platform helpers (Windows / macOS / Linux).

import { execSync, spawn } from "node:child_process";
import { platform } from "node:os";

export const isWindows = platform() === "win32";
export const isMac = platform() === "darwin";
export const isLinux = platform() === "linux";

/**
 * Locate an executable on PATH. POSIX uses `command -v` (shell builtin);
 * Windows uses `where`. Returns the absolute path or null.
 */
export function which(cmd) {
  // 인자 sanitize — `cmd` 가 사용자 입력에서 오면 안 되지만 안전 차원.
  if (!/^[A-Za-z0-9._-]+$/.test(cmd)) return null;
  const lookup = isWindows ? `where ${cmd}` : `command -v ${cmd}`;
  try {
    const out = execSync(lookup, {
      stdio: ["ignore", "pipe", "ignore"],
      // execSync 는 기본적으로 shell 통해 실행 (POSIX: /bin/sh, Win: cmd.exe).
    }).toString().trim();
    if (!out) return null;
    // Windows `where` 는 여러 매칭 시 줄 단위로 반환 → 첫 줄.
    return out.split(/\r?\n/)[0].trim();
  } catch {
    return null;
  }
}

/**
 * 외부 도구(claude/codex) spawn 시 cross-platform 옵션.
 * Windows 의 `claude.cmd` / `.bat` shim 도 잡으려면 shell: true 필요.
 */
export function spawnAgent(cmd, args = [], { cwd } = {}) {
  return spawn(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: isWindows,
  });
}

export function osLabel() {
  if (isMac) return "macOS";
  if (isWindows) return "Windows";
  if (isLinux) return "Linux";
  return platform();
}
