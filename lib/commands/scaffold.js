import { mkdir, writeFile, readFile, copyFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ok, info, warn, fail, dim, bold } from "../log.js";

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

const SPEC_TEMPLATE = `# {{NAME}} — Service Spec

> 이 문서는 \`.harness/checklist.md\` 의 8개 차원에 대한 답을 모은다.
> Claude Code 또는 Codex 한테 "checklist 8차원 짚어줘, spec.md 에 정리" 라고 하면
> 에이전트가 차원별 질문을 던지고 답을 여기 누적해준다.

## A. 목적·전략 (Why)
- ① 타겟 유저:
- ② 푸는 통증:
- ③ 성공 지표:
- ④ MVP 범위 (안 할 것 명시):

## B. 정보구조·콘텐츠 (What)
- ① 사이트맵:
- ② 콘텐츠 모델:
- ③ 작성 주체(운영자/사용자/AI):
- ④ 콘텐츠 거버넌스(초안→검수→발행→수정/삭제):

## C. 사용자·계정 (Who)
- ① 인증 방식:
- ② 역할·권한:
- ③ 온보딩 플로우:
- ④ 데이터 격리(멀티테넌시):

## D. 운영·관리자 (Operate)
- ① 관리자 페이지에서 뭘 보고/바꾸나:
- ② 코드 없이 편집할 콘텐츠:
- ③ 로그·모니터링:
- ④ 알림(운영자/사용자):

## E. 통합·자동화 (Extend)
- ① 외부 통합:
- ② API·에이전트 접근:
- ③ 백그라운드 작업:
- ④ 콘텐츠 파이프라인:

## F. 디자인·UX (Look)
- ① 디자인 토큰 — \`.harness/tokens.json\` 기반, 확장:
- ② 컴포넌트 시스템:
- ③ 반응형·접근성:
- ④ 상태 표현(로딩/빈/에러/성공):
- ⑤ 카피·톤:

## G. 인프라·보안 (Run)
- ① 호스팅·배포:
- ② DB·스토리지:
- ③ 환경변수·시크릿:
- ④ 보안(RLS/토큰/sanitize/rate limit):
- ⑤ 비용·확장성:

## H. 라이프사이클 (Evolve)
- ① 버저닝·마이그레이션:
- ② 피처 플래그·점진 롤아웃:
- ③ 사용자 피드백 루프:
- ④ 분석·실험:
`;

const TOKENS_CSS_TEMPLATE = `/* 기본 토큰 — .harness/tokens.json 에서 추출.
 * brand 색만 내 서비스에 맞게 바꿔서 시작.
 */
:root {
  /* brand */
  --brand-primary: #18181b;
  --brand-primary-hover: #27272a;
  --brand-accent: #059669;
  --brand-accent-hover: #047857;

  /* neutral */
  --n50:#fafafa; --n100:#f4f4f5; --n200:#e4e4e7; --n300:#d4d4d8;
  --n400:#a1a1aa; --n500:#71717a; --n600:#52525b; --n700:#3f3f46;
  --n800:#27272a; --n900:#18181b;

  /* status */
  --st-ok-bg:#d1fae5;   --st-ok-fg:#065f46;
  --st-warn-bg:#fef3c7; --st-warn-fg:#92400e;
  --st-err-bg:#fee2e2;  --st-err-fg:#991b1b;
  --st-info-bg:#dbeafe; --st-info-fg:#1e40af;

  /* spacing */
  --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:20px;
  --sp-6:24px; --sp-8:32px; --sp-10:40px; --sp-12:48px;

  /* radius */
  --r-sm:4px; --r-md:6px; --r-lg:8px; --r-xl:10px; --r-full:9999px;

  /* shadow */
  --sh-sm:0 1px 2px rgba(0,0,0,.05);
  --sh-md:0 2px 6px rgba(0,0,0,.08);
  --sh-lg:0 8px 24px rgba(0,0,0,.12);

  /* typography */
  --font-sans:'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-mono:ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
}
`;

const CLAUDE_TEMPLATE = `# {{NAME}} — 에이전트 운영 규칙

너는 이 프로젝트의 서비스 빌더 보조자다. 이 프로젝트는 design-library
기반 스캐폴드 위에 만들어진다.

## 규칙
1. 디자인 결정은 항상 \`.harness/tokens.json\` + \`.harness/principles.md\` 부터 시작한다.
2. UX 결정은 \`.harness/patterns/\` 와 \`.harness/content-voice.md\` 를 먼저 본다.
3. "체크리스트" = \`.harness/checklist.md\` 의 8차원 (A 목적/전략 ~ H 라이프사이클).
4. 색·크기·간격을 코드에 직접 박지 말고 \`tokens.css\` 변수만 사용한다.
5. 내 프로젝트 고유 설정은 \`.harness/instances/{{NAME_SLUG}}/\` 에 기록 (.harness/ 상위는 건드리지 않음).

## 첫 작업 추천
- "체크리스트 8차원을 짚으면서 내 서비스에 맞게 답을 채워줘. 한 차원 끝날 때마다 확인받고 진행. 결과는 spec.md 누적."
- "tokens.json 의 brand 색만 내 색으로 바꿔서 tokens.css 갱신. primary=#XXXXXX, accent=#YYYYYY."
- "patterns/ 8개 중 내 서비스에 쓸 것 3~4개만 골라줘. 안 채택할 건 이유도."

## 참고
- 원본 서비스 (camp-lms) 가 이 스캐폴드의 레퍼런스 구현.
- 갱신: \`npx @scaila/camp-cli library update\`
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
  if (!["web", "minimal"].includes(type)) {
    fail("--type: web | minimal");
    process.exit(2);
  }

  info(`scaffold ${bold(name)} (${type}) → ${dim(target)}`);
  await mkdir(target, { recursive: true });

  // .harness/ — design-library 통째
  try {
    await copyDirRecursive(path.join(ASSETS_ROOT, "harness-bundle"), path.join(target, ".harness"));
    ok(".harness/  (design-library)");
  } catch (err) {
    warn(`.harness/ 실패: ${err?.message || err}`);
  }

  const nameSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const replacements = {
    "{{NAME}}": name,
    "{{NAME_SLUG}}": nameSlug,
  };
  const fill = (s) => Object.entries(replacements).reduce((acc, [k, v]) => acc.replaceAll(k, v), s);

  await writeFile(path.join(target, "spec.md"), fill(SPEC_TEMPLATE));
  ok("spec.md  (체크리스트 8차원 — 비어 있음, 에이전트가 채울 자리)");

  await mkdir(path.join(target, "src", "styles"), { recursive: true });
  await writeFile(path.join(target, "src", "styles", "tokens.css"), TOKENS_CSS_TEMPLATE);
  ok("src/styles/tokens.css");

  await writeFile(path.join(target, "CLAUDE.md"), fill(CLAUDE_TEMPLATE));
  await writeFile(path.join(target, "AGENTS.md"), fill(CLAUDE_TEMPLATE));
  ok("CLAUDE.md / AGENTS.md");

  await writeFile(
    path.join(target, "README.md"),
    `# ${name}\n\n` +
      `${type === "web" ? "Next.js+Supabase 기반 서비스" : "최소 골격"} — design-library 스캐폴드.\n\n` +
      `## 시작\n\n` +
      `1. \`${name}\` 폴더를 Claude Code 또는 Codex 로 엽니다.\n` +
      `2. "체크리스트 8차원을 짚으면서 spec.md 에 정리해줘" 라고 말합니다.\n` +
      `3. 나머지는 \`CLAUDE.md\` 가 안내합니다.\n\n` +
      `참고: \`.harness/README.md\`\n`,
  );
  ok("README.md");

  // type=web 이면 package.json 까지 (Next.js 골격은 안 만듦 — 학생이 알아서)
  if (type === "web") {
    await writeFile(
      path.join(target, "package.json"),
      JSON.stringify({ name: nameSlug, version: "0.1.0", private: true, type: "module" }, null, 2) + "\n",
    );
    ok("package.json");
  }

  // .harness/instances/{name}/ 골격
  try {
    const tplDir = path.join(target, ".harness", "instances", "_template");
    const instDir = path.join(target, ".harness", "instances", nameSlug);
    if (existsSync(tplDir)) {
      await copyDirRecursive(tplDir, instDir);
      // README 내용 갈음
      const r = path.join(instDir, "README.md");
      try {
        let c = await readFile(r, "utf-8");
        c = c.replace(/^# .*$/m, `# ${name}`).replace(/\{프로젝트[^}]*\}/g, name);
        await writeFile(r, c);
      } catch { /* ignore */ }
      ok(`.harness/instances/${nameSlug}/`);
    }
  } catch (err) {
    warn(`instance 생성 실패: ${err?.message || err}`);
  }

  console.log();
  ok(`스캐폴드 완료. cd ${target} && claude   (또는 codex)`);
}
