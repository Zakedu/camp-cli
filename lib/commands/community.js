import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { apiPost } from "../api.js";
import { ok, fail, info, dim, bold } from "../log.js";
import { ask, confirm } from "../prompt.js";

const BOARDS = new Set([
  "assignment-share",
  "prompt-share",
  "skill-file-market",
  "qna",
  "free",
]);

export async function post(args) {
  const board = args.board || "free";
  if (!BOARDS.has(board)) {
    fail(`--board: ${[...BOARDS].join(" / ")} 중 하나`);
    process.exit(2);
  }

  let title = args.title;
  let content = args.content;
  if (args.file) {
    if (!existsSync(args.file)) {
      fail(`파일 없음: ${args.file}`);
      process.exit(2);
    }
    content = await readFile(args.file, "utf-8");
    if (!title) title = `[${board}] 공유 — ${args.file}`;
  }

  if (!title) {
    if (args.yes) { fail("--title 필수 (또는 --file)"); process.exit(2); }
    title = await ask("제목");
  }
  if (!content) {
    if (args.yes) { fail("--content 또는 --file 필수"); process.exit(2); }
    content = await ask("내용 한 줄");
  }
  if (!title || !content) { fail("제목과 내용은 필수"); process.exit(2); }

  let codeBlock = null;
  if (args.code) {
    if (existsSync(args.code)) codeBlock = await readFile(args.code, "utf-8");
    else { fail(`--code 파일 없음: ${args.code}`); process.exit(2); }
  }
  const tags = args.tags
    ? String(args.tags).split(",").map((t) => t.trim()).filter(Boolean)
    : undefined;
  const weekNumber = args.week ? Number(args.week) : undefined;
  const aiTool = args["ai-tool"];

  // 미리보기
  console.log();
  console.log(dim("── 미리보기 ────────────────────────────────"));
  console.log(`  [${board}] ${bold(title)}`);
  const preview = content.length > 400 ? content.slice(0, 400) + "..." : content;
  preview.split("\n").forEach((l) => console.log("  " + l));
  if (codeBlock) console.log(dim(`  (코드블록 ${codeBlock.length} bytes 포함)`));
  console.log(dim("────────────────────────────────────────────"));

  if (!args.yes) {
    const yes = await confirm("게시할까요?");
    if (!yes) { info("취소했습니다."); return; }
  }

  try {
    const resp = await apiPost("/api/community/posts", {
      board, title, content,
      codeBlock,
      weekNumber,
      aiTool,
      tags,
    });
    ok(`게시됨 — ${resp.post.id}`);
    info(`확인: https://camp.scaila.kr/dashboard?post=${resp.post.id}`);
  } catch (err) {
    fail(`작성 실패: ${err?.message || err}`);
    if (err?.status) console.log(dim(`  (HTTP ${err.status})`));
    process.exit(1);
  }
}

export default async function communityRoot(action, args) {
  switch (action) {
    case "post":
      return post(args);
    default:
      console.log("camp-cli community post [--board B] [--title T] (--file F | --content C) [--code path] [--week N] [--ai-tool claude] [--tags a,b] [--yes]");
      console.log("");
      console.log("  읽기·수정·삭제는 웹 대시보드에서:");
      console.log("    https://camp.scaila.kr/dashboard  (커뮤니티 탭)");
  }
}
