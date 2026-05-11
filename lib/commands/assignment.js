import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { apiGet, apiPost } from "../api.js";
import { ok, fail, info, dim, bold } from "../log.js";
import { confirm } from "../prompt.js";

export async function list(args) {
  let week = args.week ? Number(args.week) : null;
  if (!week) {
    const boot = await apiGet("/api/course/bootstrap");
    week = boot?.course?.currentWeek || 1;
  }
  const r = await apiGet(`/api/course/assignments?week=${week}`);
  console.log();
  console.log(`  ${bold(`${week}강 과제`)}`);
  for (const a of r.assignments || []) {
    console.log();
    console.log(`  [${a.id}] ${bold(a.title)} (${a.type})`);
    if (a.description) console.log(`    ${a.description}`);
    if (a.templateFile) console.log(`    ${dim("템플릿:")} ${a.templateFile}`);
    if ((a.requiredOutputs || []).length) {
      console.log(`    ${dim("산출물:")} ${a.requiredOutputs.join(", ")}`);
    }
    if ((a.acceptanceCriteria || []).length) {
      console.log(`    ${dim("완료 기준:")}`);
      for (const c of a.acceptanceCriteria) console.log(`      · ${c}`);
    }
  }
  console.log();
}

export async function submit(args) {
  const assignmentId = args._[0] || args.assignment || args.id;
  const file = args.file;
  if (!assignmentId) { fail("과제 id 필요: assignment submit <id> --file path"); process.exit(2); }
  if (!file) { fail("--file <path> 필요"); process.exit(2); }
  if (!existsSync(file)) { fail(`파일 없음: ${file}`); process.exit(2); }

  const content = await readFile(file, "utf-8");
  console.log();
  console.log(dim("── 제출 미리보기 ──"));
  console.log(`  과제: ${bold(assignmentId)}`);
  console.log(`  파일: ${file}  (${content.length} chars)`);
  const preview = content.length > 600 ? content.slice(0, 600) + "..." : content;
  preview.split("\n").forEach((l) => console.log("  " + l));
  console.log(dim("───────────────────"));

  if (!args.yes) {
    const yes = await confirm("제출할까요?");
    if (!yes) { info("취소했습니다."); return; }
  }

  try {
    const resp = await apiPost("/api/course/submissions", {
      assignmentId,
      content,
      localFileName: path.basename(file),
      source: "claude_code",
    });
    ok(`제출 완료 — submission ${resp.submissionId}`);
  } catch (err) {
    fail(`제출 실패: ${err?.message || err}`);
    process.exit(1);
  }
}

export default async function root(action, args) {
  switch (action) {
    case "list": return list(args);
    case "submit": return submit(args);
    default:
      console.log("camp-cli assignment list [--week N]");
      console.log("camp-cli assignment submit <id> --file outputs/x.md [--yes]");
  }
}
