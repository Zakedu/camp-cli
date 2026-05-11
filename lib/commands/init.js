import { mkdir, writeFile, readFile, copyFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { apiGet, recordEvent, ApiError } from "../api.js";
import { ok, info, warn, fail, dim } from "../log.js";
import { ask, confirm } from "../prompt.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_ROOT = path.resolve(__dirname, "../../assets");

async function copyDirRecursive(src, dst) {
  await mkdir(dst, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) {
      await copyDirRecursive(s, d);
    } else if (e.isFile()) {
      // Skip overwrite if dst exists (멱등 — 사용자가 수정한 것 보호)
      if (!existsSync(d)) await copyFile(s, d);
    }
  }
}

async function writeIfMissing(filePath, content) {
  if (existsSync(filePath)) return false;
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
  return true;
}

/**
 * 워크스페이스 생성/갱신.
 *   ai-camp-week{N}/
 *     CLAUDE.md, AGENTS.md
 *     course-manifest.json, assignments.json
 *     templates/
 *     practice/week-{N}/   (이번 주 자료 다운로드)
 *     outputs/
 *     .harness/  (design-library 번들 — 학생이 자기 서비스 만들 때 참고용)
 *     troubleshooting.md
 */
export default async function init({ folder, interactive = true, refreshOnly = false } = {}) {
  info("워크스페이스 준비");

  // bootstrap 으로 현재 주차 가져옴
  let boot;
  try {
    boot = await apiGet("/api/course/bootstrap");
  } catch (err) {
    fail(`bootstrap 실패: ${err?.message || err}`);
    return null;
  }
  const week = boot?.course?.currentWeek || 1;
  const studentName = boot?.student?.name || "학생";
  const groupName = boot?.student?.group || "";

  const defaultFolder = `./ai-camp-week${week}`;
  let target = folder;
  if (!target) {
    target = interactive
      ? await ask("폴더 이름", { defaultValue: defaultFolder })
      : defaultFolder;
  }
  const abs = path.resolve(target);
  const exists = existsSync(abs);
  if (exists && interactive && !refreshOnly) {
    const yes = await confirm(`${dim(abs)} 가 이미 있습니다. 자료 새로고침할까요?`, { defaultYes: true });
    if (!yes) {
      warn("init 건너뜀.");
      return { folder: abs, skipped: true };
    }
  }
  await mkdir(abs, { recursive: true });

  // 1. manifest / assignments
  try {
    const manifest = await apiGet("/api/setup/manifest");
    await writeFile(
      path.join(abs, "course-manifest.json"),
      JSON.stringify(manifest, null, 2),
    );
    ok("course-manifest.json");
  } catch (err) {
    warn(`manifest 실패: ${err?.message || err}`);
  }
  try {
    const aj = await apiGet("/api/setup/assignments");
    await writeFile(
      path.join(abs, "assignments.json"),
      JSON.stringify(aj, null, 2),
    );
    ok("assignments.json");
  } catch (err) {
    warn(`assignments 실패: ${err?.message || err}`);
  }

  // 2. templates/
  try {
    const tpl = await apiGet("/api/setup/templates");
    const tplDir = path.join(abs, "templates");
    await mkdir(tplDir, { recursive: true });
    for (const t of tpl.templates || []) {
      await writeIfMissing(path.join(tplDir, t.filename), t.content);
    }
    ok(`templates/ (${(tpl.templates || []).length} 파일)`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      warn("templates 엔드포인트 없음 (서버 구버전) — 건너뜀");
    } else {
      warn(`templates 실패: ${err?.message || err}`);
    }
  }

  // 3. 이번 주 자료 — practice/week-{N}/
  try {
    const mats = await apiGet(`/api/course/materials?week=${week}`);
    const matDir = path.join(abs, "practice", `week-${week}`);
    await mkdir(matDir, { recursive: true });
    let saved = 0;
    for (const m of mats.materials || []) {
      try {
        const buf = await apiGet(`/api/course/materials/${encodeURIComponent(m.id)}/download`);
        const name = path.basename(m.filePath || `${m.id}.bin`);
        await writeFile(path.join(matDir, name), Buffer.from(buf));
        saved++;
      } catch (e) {
        warn(`  자료 ${m.id} 다운로드 실패: ${e?.message || e}`);
      }
    }
    ok(`practice/week-${week}/ (${saved} 파일)`);
  } catch (err) {
    warn(`materials 실패: ${err?.message || err}`);
  }

  // 4. outputs/
  await mkdir(path.join(abs, "outputs"), { recursive: true });
  ok("outputs/");

  // 5. CLAUDE.md / AGENTS.md / troubleshooting.md (assets/workspace-templates/)
  const wsTpl = path.join(ASSETS_ROOT, "workspace-templates");
  const meta = {
    "{{STUDENT_NAME}}": studentName,
    "{{GROUP_NAME}}": groupName,
    "{{CURRENT_WEEK}}": String(week),
    "{{BASE_URL}}": boot?.baseUrl || "https://camp.scaila.kr",
  };
  for (const fname of ["CLAUDE.md", "AGENTS.md", "troubleshooting.md"]) {
    try {
      const src = path.join(wsTpl, fname);
      let content = await readFile(src, "utf-8");
      for (const [k, v] of Object.entries(meta)) content = content.replaceAll(k, v);
      const dst = path.join(abs, fname);
      // CLAUDE.md/AGENTS.md 항상 갱신 (사용자가 손댔으면 .bak 로 백업)
      if (existsSync(dst) && (fname === "CLAUDE.md" || fname === "AGENTS.md")) {
        const cur = await readFile(dst, "utf-8");
        if (cur !== content) {
          await writeFile(dst + ".bak", cur);
          await writeFile(dst, content);
        }
      } else {
        await writeIfMissing(dst, content);
      }
      ok(fname);
    } catch (err) {
      warn(`${fname} 실패: ${err?.message || err}`);
    }
  }

  // 6. .harness/ — design-library 번들 (Track B 자산)
  try {
    const src = path.join(ASSETS_ROOT, "harness-bundle");
    const dst = path.join(abs, ".harness");
    await copyDirRecursive(src, dst);
    ok(".harness/  (design-library 참고 자료)");
  } catch (err) {
    warn(`.harness/ 실패: ${err?.message || err}`);
  }

  await recordEvent("cli_init_completed", { folder: abs, week });
  console.log();
  ok(`완료 — ${dim(abs)}`);
  return { folder: abs };
}
