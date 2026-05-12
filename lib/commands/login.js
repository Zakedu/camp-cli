import { DEFAULT_BASE_URL, apiGet, apiPost, recordEvent, ApiError } from "../api.js";
import { saveCredentials, loadCredentials, isTokenExpired } from "../auth.js";
import { ask, closePrompt } from "../prompt.js";
import { ok, fail, info, dim, warn, cyan } from "../log.js";

const MAX_TRIES = 3;

/**
 * 6자리 코드 → 토큰 교환.
 * 1) POST /api/setup/resolve-code { shortCode }
 * 2) setupUrl 에서 토큰 추출
 * 3) ~/.camp/credentials.json 저장
 * 4) /api/course/bootstrap 으로 검증 + 학생 정보 표시
 */
export default async function login({ code, force = false, baseUrl } = {}) {
  const cfgBase = baseUrl || process.env.CAMP_BASE_URL || DEFAULT_BASE_URL;

  if (!force) {
    const existing = await loadCredentials();
    if (existing && !isTokenExpired(existing)) {
      info(`이미 로그인됨 — ${existing.studentName || "(이름 없음)"} (${existing.groupName || "?"})`);
      info(`만료: ${existing.expiresAt || "정보 없음"}`);
      info(`재인증하려면: ${dim("npx @scaila/camp-cli login --force")}`);
      return existing;
    }
  }

  console.log();
  console.log(`  ${cfgBase} 의 대시보드 [터미널 연결] 카드에서`);
  console.log(`  6자리 코드를 입력하세요.`);

  let creds = null;
  for (let tries = 0; tries < MAX_TRIES; tries++) {
    let raw = code;
    code = undefined; // 첫 시도 후엔 다시 묻기
    if (!raw) {
      raw = await ask("코드");
    }
    // 사용자가 NCV-RHA / NCVRHA / ncv-rha / NCV RHA 어떻게 치든
    // 서버 형식 (XXX-XXX) 로 정규화
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean.length !== 6) {
      fail(`코드는 6자 (예: NCV-RHA). 받은 입력: "${raw}"`);
      continue;
    }
    const shortCode = `${clean.slice(0, 3)}-${clean.slice(3)}`;

    try {
      const resp = await apiPost(
        "/api/setup/resolve-code",
        { shortCode },
        { baseUrl: cfgBase, requireAuth: false },
      );
      const setupUrl = resp.setupUrl;
      if (!setupUrl || typeof setupUrl !== "string") {
        fail("서버 응답에 setupUrl 이 없습니다.");
        continue;
      }
      const m = setupUrl.match(/\/setup\/([^/?#]+)/);
      if (!m) {
        fail(`setupUrl 형식 인식 실패: ${setupUrl}`);
        continue;
      }
      const token = m[1];
      const expiresAt = resp.expiresAt || null;

      creds = {
        token,
        baseUrl: cfgBase,
        shortCode: resp.shortCode || null,
        expiresAt,
        savedAt: new Date().toISOString(),
      };
      await saveCredentials(creds);
      break;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) fail("코드를 찾을 수 없습니다. 대시보드 카드를 새로고침하면 새 코드가 나옵니다.");
        else if (err.status === 410) fail("코드가 만료됐습니다. 대시보드에서 새 코드를 받아주세요.");
        else fail(`로그인 실패: ${err.message}`);
      } else {
        fail(`로그인 실패: ${err?.message || String(err)}`);
      }
    }
  }

  if (!creds) {
    fail("3회 실패 — 종료. 대시보드에서 코드를 다시 확인해주세요.");
    closePrompt();
    process.exit(1);
  }

  try {
    const boot = await apiGet("/api/course/bootstrap");
    creds.studentName = boot?.student?.name || null;
    creds.studentEmail = boot?.student?.email || null;
    creds.groupName = boot?.student?.group || null;
    creds.currentWeek = boot?.course?.currentWeek || null;
    await saveCredentials(creds);
    ok(`인증 완료 — ${creds.studentName}님 · ${creds.groupName} · 현재 ${creds.currentWeek}강`);
  } catch (err) {
    warn(`인증은 됐지만 학생 정보 조회 실패: ${err?.message || err}`);
  }

  await recordEvent("cli_login_completed", {});

  // Next-step 안내 (login 서브명령 단독 호출 시)
  console.log();
  console.log(`  ${dim("다음:")} ${cyan("npx @scaila/camp-cli")}        ${dim("마법사 — init + 커뮤니티 + 에이전트 진입")}`);
  console.log(`         ${cyan("npx @scaila/camp-cli init")}    ${dim("워크스페이스만 만들기")}`);
  console.log(`         ${cyan("npx @scaila/camp-cli status")}  ${dim("현재 주차·자료·과제")}`);
  console.log(`         ${cyan("npx @scaila/camp-cli agent")}   ${dim("(폴더 안에서) Claude Code 실행")}`);
  console.log();
  console.log();

  return creds;
}
