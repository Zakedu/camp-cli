import { ok, info, warn, step, dim, bold } from "./log.js";
import { confirm, ask, closePrompt } from "./prompt.js";
import { loadCredentials, isTokenExpired } from "./auth.js";
import { apiPost } from "./api.js";
import doctor from "./commands/doctor.js";
import login from "./commands/login.js";
import init from "./commands/init.js";

const TOTAL = 5;

async function step1() {
  step(1, TOTAL, "환경 점검");
  await doctor();
}

async function step2() {
  step(2, TOTAL, "로그인");
  return login({});
}

async function step3() {
  step(3, TOTAL, "작업 폴더");
  return init({ interactive: true });
}

async function step4(creds) {
  step(4, TOTAL, "커뮤니티 — 첫 글 (선택)");

  console.log(`  ${dim("(읽기·전체 글은 https://camp.scaila.kr/dashboard 커뮤니티 탭)")}`);
  console.log();
  const want = await confirm("주차 시작 인사나 이번 주 목표를 한 줄 남길까요?", { defaultYes: false });
  if (!want) {
    info("커뮤니티 건너뜀.");
    return;
  }
  const content = await ask("내용 한 줄");
  if (!content) { info("내용 없음 — 건너뜀."); return; }
  const week = creds?.currentWeek || null;
  const title = `${week ? week + "주차 " : ""}시작 — ${(creds?.studentName || "").slice(0, 20)}`;

  console.log();
  console.log(dim("── 미리보기 ────────────────"));
  console.log(`  [free / ${creds?.groupName || ""}]  ${bold(creds?.studentName || "")}`);
  console.log(`  ${title}`);
  console.log(`  ${content}`);
  console.log(dim("───────────────────────────"));

  const go = await confirm("게시할까요?", { defaultYes: true });
  if (!go) { info("취소."); return; }

  try {
    const r = await apiPost("/api/community/posts", {
      board: "free",
      title,
      content,
      weekNumber: week,
    });
    ok(`게시됨 — ${r.post.id}`);
    console.log(`  ${dim("확인:")} https://camp.scaila.kr/dashboard?post=${r.post.id}`);
  } catch (err) {
    warn(`작성 실패: ${err?.message || err}`);
  }
}

function step5(creds) {
  step(5, TOTAL, "완료 🎉");
  const folder = "./ai-camp-week" + (creds?.currentWeek || "?");
  console.log();
  console.log(`  ${bold("추천")}`);
  console.log(`    Claude Code 또는 Codex 열고 ${dim(folder)} 폴더 지정`);
  console.log(`    "오늘 수업 준비해줘" 한 문장`);
  console.log();
  console.log(`  ${bold("직접 명령")}`);
  console.log(`    npx @scaila/camp-cli status`);
  console.log(`    npx @scaila/camp-cli assignment list`);
  console.log(`    npx @scaila/camp-cli assignment submit <id> --file outputs/x.md --yes`);
  console.log(`    npx @scaila/camp-cli community post --board assignment-share \\`);
  console.log(`        --title "..." --file outputs/x.md --yes`);
  console.log();
  console.log(`  ${dim("자기 서비스 시작:")} npx @scaila/camp-cli scaffold my-service`);
  console.log();
}

export default async function runWizard() {
  console.log();
  console.log("  " + bold("AI CAMP — 터미널 연결 마법사"));
  console.log("  " + dim("Codex 또는 Claude Code 와 함께 사용. 중단: Ctrl+C — 다시 실행해도 안전."));

  try {
    await step1();
    let creds = await loadCredentials();
    if (!creds || isTokenExpired(creds)) {
      creds = await step2();
    } else {
      step(2, TOTAL, "로그인 — 이미 인증됨");
      info(`${creds.studentName || "(이름 없음)"} · ${creds.groupName || ""}`);
      info(`만료까지 ${creds.expiresAt || "?"}`);
    }
    await step3();
    await step4(creds);
    step5(creds);
  } finally {
    closePrompt();
  }
}
