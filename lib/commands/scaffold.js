import { mkdir, writeFile, readFile, copyFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ok, info, warn, fail, dim, bold } from "../log.js";
import { apiGet } from "../api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_ROOT = path.resolve(__dirname, "../../assets");

async function copyDirRecursive(src, dst) {
  await mkdir(dst, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) await copyDirRecursive(s, d);
    else if (e.isFile() && !existsSync(d)) await copyFile(s, d);
  }
}

/* ─────────────────────────────────────────────────────────────
   plan.md — 학생 본인의 1주차 제출물에서 자동으로 채운다.
   ───────────────────────────────────────────────────────────── */
function fmtKv(data) {
  if (!data || typeof data !== "object") return "(없음)";
  return Object.entries(data)
    .filter(([, v]) => typeof v === "string" && !v.startsWith("data:image/"))
    .map(([k, v]) => `**${k}**\n\n${v}\n`)
    .join("\n");
}

async function buildPlanMd(name) {
  let header = `# ${name} — 내 자동화 계획 (1주차 제출물)\n\n` +
    `> 이 파일은 1주차에 LMS 에 제출한 자동화/서비스 계획이다.\n` +
    `> Claude Code/Codex 가 이걸 읽고 MVP 골격(index.html·spec.md·golden/)을 채운다.\n\n`;
  try {
    const r = await apiGet("/api/course/my-submissions");
    const aMap = new Map((r.assignments || []).map((a) => [a.id, a]));
    const lines = [];
    if (r.student?.name) lines.push(`- 학생: ${r.student.name} (${r.student.group || "-"})`);
    lines.push("");
    const all = [
      ...(r.submissions || []).map((s) => ({ id: s.assignment_id, kind: "web", body: s.data })),
      ...(r.onboardSubmissions || []).map((s) => ({ id: s.assignment_id, kind: "cli", body: s.content })),
    ];
    if (all.length === 0) {
      return header + "_(1주차 제출물을 아직 못 찾았습니다 — 아래에 직접 붙여넣으세요.)_\n\n" + PLAN_BLANK;
    }
    for (const s of all) {
      const a = aMap.get(s.id);
      const title = a?.title || s.id;
      lines.push(`\n## ${title}${a?.week_number ? `  (${a.week_number}주차/${a.type || "-"})` : ""}`);
      if (s.kind === "web") lines.push(fmtKv(s.body));
      else lines.push("```\n" + String(s.body || "").slice(0, 8000) + "\n```");
    }
    return header + lines.join("\n") + "\n";
  } catch (err) {
    return header +
      `_(로그인이 안 되어 있어 1주차 제출물을 못 끌어왔습니다 — \`npx @scaila/camp-cli login\` 후 \`scaffold\` 를 다시 돌리거나, 아래에 직접 붙여넣으세요.)_\n\n` +
      PLAN_BLANK;
  }
}

const PLAN_BLANK = `## 타겟 업무
(1주차에 정한 자동화 대상 한 줄)

## AI 가 할 일 / 사람이 할 일
- AI:
- 사람:

## 기대 산출물
(이 자동화가 만들어내는 것)

## 선정한 후보 설명
(왜 이걸 골랐는지, 어떤 입력 → 어떤 출력인지)
`;

/* ─────────────────────────────────────────────────────────────
   템플릿 파일들
   ───────────────────────────────────────────────────────────── */
const SPEC_TEMPLATE = `# {{NAME}} — Service Spec

> \`.harness/checklist.md\` 의 8개 차원에 대한 답을 모은다.
> Claude Code/Codex 가 plan.md(1주차 계획)에서 끌어낼 수 있는 만큼 채우고, 모르는 건 한 번에 물어본다.

## A. 목적·전략 (Why)
- ① 타겟 유저:
- ② 푸는 통증:
- ③ 성공 지표:
- ④ MVP 범위 (안 할 것 명시):

## B. 정보구조·콘텐츠 (What)
- ① 사이트맵 (이번 2주차엔 1페이지):
- ② 콘텐츠 모델 (입력 타입 / 출력 타입):
- ③ 작성 주체:
- ④ 거버넌스:

## C. 사용자·계정 (Who)
- ① 인증 (5~6주차):
- ② 역할·권한:
- ③ 온보딩:
- ④ 데이터 격리:

## D. 운영·관리자 (Operate)  — 5~6주차
- ① 관리자 페이지:
- ② 코드 없이 편집:
- ③ 로그·모니터링:
- ④ 알림:

## E. 통합·자동화 (Extend)
- ① 외부 통합:  ⚠️ 직접 조작 불가 시스템(정부·ERP 등)은 '데이터 생성까지'로 한정
- ② API·에이전트 접근:
- ③ 백그라운드 작업:
- ④ 콘텐츠 파이프라인 (입력 → AI 가공 → 출력):

## F. 디자인·UX (Look)
- ① 디자인 토큰 — tokens.css 기반, brand 색:
- ② 컴포넌트:
- ③ 반응형·접근성:
- ④ 상태 표현 (로딩/빈/에러/성공):
- ⑤ 카피·톤:

## G. 인프라·보안 (Run)  — 5~6주차
- ① 호스팅·배포:
- ② DB·스토리지:
- ③ 환경변수·시크릿:
- ④ 보안(RLS/토큰/sanitize/rate limit):
- ⑤ 비용·확장성:

## H. 라이프사이클 (Evolve)  — 후반
- ① 버저닝·마이그레이션:
- ② 피처 플래그:
- ③ 사용자 피드백 루프:
- ④ 분석·실험:
`;

const INDEX_HTML = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{{NAME}} — MVP</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>:root{--brand:#0F172A;--accent:#10B981}</style>
</head>
<body class="bg-[#fafafa] text-[#27272a] font-sans">
<!--
  ※ 2주차 MVP 골격 — 1페이지(입력 → 실행 → 출력).
  Claude Code/Codex 가 plan.md 를 보고 아래 [SERVICE_NAME] · [INPUT_LABEL] ·
  [OUTPUT_TITLE] · 샘플 데이터를 학생 도메인으로 채운다.
  "실행"의 실제 로직은 5~6주차에 연결. 지금은:
    - 입력을 inputs/latest.md 에 저장 (또는 학생이 Claude Code 에게 전달)
    - Claude Code 가 golden/ 참조해 outputs/draft-N.md 생성
    - 그 결과를 출력 패널에 표시 (학생이 붙여넣거나 Claude Code 가 직접 수정)
-->
<header class="border-b border-[#e4e4e7] bg-white">
  <div class="max-w-5xl mx-auto px-6 py-4">
    <h1 class="text-lg font-bold text-[var(--brand)]">[SERVICE_NAME]</h1>
    <p class="text-[13px] text-[#71717a]">[ONE_LINE_DESCRIPTION]</p>
  </div>
</header>

<main class="max-w-5xl mx-auto px-6 py-8 grid md:grid-cols-2 gap-6">
  <!-- 입력 패널 -->
  <section class="bg-white border border-[#e4e4e7] rounded-lg p-5">
    <h2 class="text-[14px] font-bold mb-3">[INPUT_LABEL]</h2>
    <textarea id="input" rows="12"
      class="w-full text-[13px] border border-[#e4e4e7] rounded-md p-3 font-mono"
      placeholder="[INPUT_PLACEHOLDER — 학생 도메인의 실제 입력 예시]"></textarea>
    <button id="run"
      class="mt-3 px-4 py-2 rounded-md bg-[var(--brand)] text-white text-[13px] font-semibold">
      실행
    </button>
    <p class="text-[11px] text-[#a1a1aa] mt-2">
      ※ 2주차엔 "실행"이 입력을 inputs/latest.md 로 저장합니다.
      그 다음 Claude Code 에게 "inputs/latest.md 와 golden/ 보고 초안 만들어줘" 라고 시키세요.
    </p>
  </section>

  <!-- 출력 패널 -->
  <section class="bg-white border border-[#e4e4e7] rounded-lg p-5">
    <h2 class="text-[14px] font-bold mb-3">[OUTPUT_TITLE]</h2>
    <div id="output" class="text-[13px] text-[#27272a] whitespace-pre-wrap leading-relaxed
      bg-[#fafafa] border border-[#e4e4e7] rounded-md p-3 min-h-[16rem]">
      [SAMPLE_OUTPUT — 학생 도메인의 이상적인 출력 예시. 처음엔 golden/output-example.md 내용을 보여주고,
       outputs/draft-1.md 가 생기면 그걸로 교체]
    </div>
  </section>
</main>

<footer class="max-w-5xl mx-auto px-6 py-6 text-[11px] text-[#a1a1aa]">
  {{NAME}} · AI CAMP 하네스 엔지니어링 완주반 · MVP 골격 (5~6주차에 본격 화면으로 확장)
</footer>

<script>
document.getElementById('run').addEventListener('click', () => {
  const v = document.getElementById('input').value.trim();
  if (!v) { alert('입력을 넣어주세요.'); return; }
  // 2주차 골격: 입력을 localStorage 에 저장 (Claude Code 가 inputs/latest.md 로 옮기게)
  localStorage.setItem('camp_mvp_input', v);
  alert('입력을 저장했습니다.\\n이제 Claude Code/Codex 에게 이렇게 시키세요:\\n\\n"localStorage 의 camp_mvp_input (또는 내가 지금 줄게) 와 golden/ 을 보고 outputs/draft-1.md 를 만들고, index.html 의 출력 패널에 반영해줘."');
});
</script>
</body>
</html>
`;

const GOLDEN_README = `# golden/ — 컨텍스트 (골든 데이터)

여기에 본인 자동화의 골든 데이터를 넣는다:
- \`input-example.md\` — 실제로 들어올 입력 데이터 1~3건 (가공 금지)
- \`output-example.md\` — 그 입력에 대한 이상적인 출력 1~2건 (직접 잘 쓴 것)

에이전트는 이 폴더를 보고 "이런 입력엔 이런 출력을 내야 하는구나" 를 배운다.
양·형태는 LMS 실습 자료 \`ch2-golden-data-template.md\` 참고.
`;

const CLAUDE_MASTER = `# {{NAME}} — 마스터 프롬프트 (1주차 계획 → MVP 골격)

너는 이 학생의 1주차 자동화 계획을 받아서, 실제로 보이는 최소 MVP 한 페이지를 만든다.
Claude Code 와 Codex 가 동일하게 이 문서를 따른다(\`AGENTS.md\` 동일).

## 1) 계획 읽기
\`plan.md\` 에 1주차 제출물이 들어 있다 (LMS 에서 자동으로 끌어온 것):
타겟 업무 / AI가 할 일·사람이 할 일 / 기대 산출물 / 선정한 후보 설명.
plan.md 가 비어 있으면 학생에게 "1주차 계획을 plan.md 에 붙여넣어 주세요" 라고 요청한 뒤 진행.

## 2) spec.md 채우기
\`.harness/checklist.md\` 8차원 중 **A(목적)·B(콘텐츠 모델)·C(사용자)·F(화면)** 을 plan.md 에서
끌어낼 수 있는 만큼 채워 \`spec.md\` 에 저장한다. 비는 칸은 학생에게 *한 번에* 물어본다.
D·G·H 는 "5~6주차" 로 표시만 하고 비워둔다.

## 3) index.html 채우기 (이미 1페이지 골격이 있다)
\`index.html\` 의 다음 자리를 학생 도메인으로 바꾼다:
- \`[SERVICE_NAME]\` / \`[ONE_LINE_DESCRIPTION]\` — 학생 자동화 이름·한 줄 설명
- \`[INPUT_LABEL]\` / \`[INPUT_PLACEHOLDER]\` — 실제 입력 (예: "고객 리뷰 붙여넣기" / 샘플 리뷰)
- \`[OUTPUT_TITLE]\` / \`[SAMPLE_OUTPUT]\` — expected_result 형식 (예: "분류 결과 + 답글 초안" / golden/output-example.md 내용)
- \`--brand\` / \`--accent\` 색을 학생 취향대로 (tokens.css 의 brand 색과 맞춤)
- ⚠️ 외부 시스템(정부사이트·ERP·증권사 등)에 직접 게시·제출하는 코드는 절대 넣지 않는다 — 출력 표시까지만.
- 라우팅·DB·로그인·어드민은 만들지 않는다 (5~6주차). 지금은 input→실행→output 한 페이지.

## 4) golden/ 만들기
\`golden/input-example.md\`, \`golden/output-example.md\` 빈 파일을 만들고(이미 있으면 둠),
학생에게 "실제 입력 1~3건 + 이상적 출력 1~2건을 넣으세요" 라고 안내한다(\`ch2-golden-data-template.md\` 참고).

## 5) 첫 초안
학생이 golden/ 을 채우면 → "golden/ 보고 새 입력에 대한 첫 초안 만들어줘 → outputs/draft-1.md".
그 다음 index.html 의 출력 패널에 그 결과를 반영하고, 학생에게 \`open index.html\` 로 확인하라고 안내.

## 절대 규칙
- 화면은 1페이지 골격. 라우팅·DB·로그인·어드민은 5~6주차.
- API 키는 \`.env\` 에 (코드 하드코딩·화면 출력 금지). 실행 로직은 5~6주차에 연결 — 지금은 Claude Code 가 직접 초안을 만든다.
- 학생 승인 없이 외부 동작(게시·전송·결제 등) 금지.
- 디자인 결정은 \`.harness/tokens.json\` + \`.harness/principles.md\` 부터. UX 는 \`.harness/patterns/\` + \`.harness/content-voice.md\`.
- 변경 기록은 \`.harness/instances/{{NAME_SLUG}}/\` 에.

## 다음 단계 (학생에게 알려줄 것)
- 3주차: 제약 조건 — spec.md 의 규칙을 더 박는다.
- 4주차: 출력 제어 — 출력 템플릿 고정.
- 5주차: 에이전트 다중화 + 평가 루프 — 단계가 많으면 \`.harness/patterns/agent-status-kanban.md\` 패턴(github.com/Zakedu/kanban-system)으로 펼친다.
- 6주차: Demo Day & 운영 — index.html 을 여러 페이지·어드민·실제 로직으로 확장 + 배포.
`;

export default async function scaffold(args) {
  const name = args._[0] || args.name;
  if (!name) {
    fail("프로젝트 이름 필요: scaffold <name>");
    process.exit(2);
  }
  const target = path.resolve(args.dir || name);
  if (existsSync(target) && !args.force) {
    fail(`이미 존재: ${target}  (덮어쓰려면 --force)`);
    process.exit(2);
  }
  const type = args.type || "web";

  info(`scaffold ${bold(name)} (${type}) → ${dim(target)}`);
  await mkdir(target, { recursive: true });

  const nameSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const fill = (s) => s.replaceAll("{{NAME}}", name).replaceAll("{{NAME_SLUG}}", nameSlug);

  // .harness/
  try {
    await copyDirRecursive(path.join(ASSETS_ROOT, "harness-bundle"), path.join(target, ".harness"));
    ok(".harness/  (design-library + checklist + patterns)");
  } catch (err) { warn(`.harness/ 실패: ${err?.message || err}`); }

  // plan.md — 본인 1주차 제출물 자동 채움
  await writeFile(path.join(target, "plan.md"), fill(await buildPlanMd(name)));
  ok("plan.md  (1주차 제출물 — LMS 에서 자동 채움)");

  // spec.md
  await writeFile(path.join(target, "spec.md"), fill(SPEC_TEMPLATE));
  ok("spec.md  (체크리스트 8차원 골격)");

  // index.html — 1페이지 MVP 골격
  await writeFile(path.join(target, "index.html"), fill(INDEX_HTML));
  ok("index.html  (1페이지 MVP 골격 — 입력→실행→출력)");

  // golden/ / outputs/ / inputs/
  await mkdir(path.join(target, "golden"), { recursive: true });
  await writeFile(path.join(target, "golden", "README.md"), GOLDEN_README);
  await writeFile(path.join(target, "golden", "input-example.md"), "(여기에 실제 입력 데이터 1~3건 — 가공 금지)\n");
  await writeFile(path.join(target, "golden", "output-example.md"), "(여기에 이상적인 출력 1~2건 — 직접 잘 쓴 것)\n");
  await mkdir(path.join(target, "outputs"), { recursive: true });
  await mkdir(path.join(target, "inputs"), { recursive: true });
  ok("golden/ · outputs/ · inputs/");

  // src/styles/tokens.css
  await mkdir(path.join(target, "src", "styles"), { recursive: true });
  await writeFile(path.join(target, "src", "styles", "tokens.css"), TOKENS_CSS);
  ok("src/styles/tokens.css");

  // CLAUDE.md / AGENTS.md = 마스터 프롬프트
  const master = fill(CLAUDE_MASTER);
  await writeFile(path.join(target, "CLAUDE.md"), master);
  await writeFile(path.join(target, "AGENTS.md"), master);
  ok("CLAUDE.md / AGENTS.md  (마스터 프롬프트)");

  // README / package.json
  await writeFile(
    path.join(target, "README.md"),
    `# ${name}\n\nAI CAMP 하네스 엔지니어링 완주반 — 내 자동화 MVP.\n\n` +
      `## 시작\n1. 이 폴더를 Claude Code 또는 Codex 로 연다.\n` +
      `2. "plan.md 보고 index.html · spec.md · golden/ 을 내 자동화로 채워줘" 라고 시킨다.\n` +
      `3. golden/ 에 실제 입력·출력 예시를 넣고 → "golden/ 보고 첫 초안 만들어줘".\n` +
      `4. \`open index.html\` 로 화면 확인.\n\n` +
      `자세한 건 CLAUDE.md(마스터 프롬프트), .harness/checklist.md, .harness/README.md 참고.\n`,
  );
  if (type === "web") {
    await writeFile(
      path.join(target, "package.json"),
      JSON.stringify({ name: nameSlug, version: "0.1.0", private: true, type: "module" }, null, 2) + "\n",
    );
  }
  ok("README.md" + (type === "web" ? " · package.json" : ""));

  // .harness/instances/<name>/
  try {
    const tplDir = path.join(target, ".harness", "instances", "_template");
    const instDir = path.join(target, ".harness", "instances", nameSlug);
    if (existsSync(tplDir) && !existsSync(instDir)) {
      await copyDirRecursive(tplDir, instDir);
      ok(`.harness/instances/${nameSlug}/`);
    }
  } catch (err) { warn(`instance 생성 실패: ${err?.message || err}`); }

  console.log();
  ok(`스캐폴드 완료.`);
  console.log(`  ${dim("다음:")} cd ${path.relative(process.cwd(), target) || "."} && claude   (또는 codex)`);
  console.log(`  ${dim("그리고:")} "plan.md 보고 index.html·spec.md·golden/ 을 내 자동화로 채워줘"`);
}

const TOKENS_CSS = `/* 디자인 토큰 — .harness/tokens.json 추출. brand 색만 내 서비스에 맞게 바꿔서 시작. */
:root{
  --brand-primary:#0F172A; --brand-primary-hover:#1e293b;
  --brand-accent:#10B981; --brand-accent-hover:#059669;
  --n50:#fafafa;--n100:#f4f4f5;--n200:#e4e4e7;--n300:#d4d4d8;--n400:#a1a1aa;
  --n500:#71717a;--n600:#52525b;--n700:#3f3f46;--n800:#27272a;--n900:#18181b;
  --st-ok-bg:#d1fae5;--st-ok-fg:#065f46;--st-warn-bg:#fef3c7;--st-warn-fg:#92400e;
  --st-err-bg:#fee2e2;--st-err-fg:#991b1b;--st-info-bg:#dbeafe;--st-info-fg:#1e40af;
  --sp-1:4px;--sp-2:8px;--sp-3:12px;--sp-4:16px;--sp-5:20px;--sp-6:24px;--sp-8:32px;
  --r-sm:4px;--r-md:6px;--r-lg:8px;--r-xl:10px;--r-full:9999px;
  --sh-sm:0 1px 2px rgba(0,0,0,.05);--sh-md:0 2px 6px rgba(0,0,0,.08);--sh-lg:0 8px 24px rgba(0,0,0,.12);
  --font-sans:'Pretendard Variable',Pretendard,-apple-system,BlinkMacSystemFont,system-ui,sans-serif;
  --font-mono:ui-monospace,SFMono-Regular,'SF Mono',Menlo,monospace;
}
`;
