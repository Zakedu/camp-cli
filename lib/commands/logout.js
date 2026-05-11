import { clearCredentials, loadCredentials } from "../auth.js";
import { confirm } from "../prompt.js";
import { ok, warn, info } from "../log.js";

export default async function logout({ yes = false } = {}) {
  const creds = await loadCredentials();
  if (!creds) {
    info("로그인되어 있지 않습니다.");
    return;
  }
  if (!yes) {
    const go = await confirm("로그아웃하면 다시 6자리 코드가 필요합니다. 계속할까요?");
    if (!go) { info("취소."); return; }
  }
  await clearCredentials();
  ok("~/.camp/credentials.json 제거됨");
  warn("재인증: npx @scaila/camp-cli login");
}
