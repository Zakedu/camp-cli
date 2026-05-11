#!/usr/bin/env node
// @scaila/camp-cli — entry point.

import { closePrompt } from "../lib/prompt.js";
import { fail } from "../lib/log.js";

const VERSION = "0.1.0";

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--yes" || a === "-y") out.yes = true;
    else if (a === "--force") out.force = true;
    else if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--version" || a === "-V") out.version = true;
    else if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) out[key] = true;
      else { out[key] = next; i++; }
    } else {
      out._.push(a);
    }
  }
  return out;
}

function printHelp() {
  console.log(`@scaila/camp-cli v${VERSION}

사용:
  npx @scaila/camp-cli                              마법사 (doctor → login → init → community → next)
  npx @scaila/camp-cli doctor                       환경 점검
  npx @scaila/camp-cli login [--code AB1234]        6자리 코드로 로그인
  npx @scaila/camp-cli logout
  npx @scaila/camp-cli init [--folder ./...]         워크스페이스 생성/갱신
  npx @scaila/camp-cli status                       현재 주차·자료·과제 현황

  npx @scaila/camp-cli assignment list [--week N]
  npx @scaila/camp-cli assignment submit <id> --file outputs/x.md [--yes]

  npx @scaila/camp-cli community post --board <b> --title "..." --file outputs/x.md [--yes]
                                                  --board: assignment-share | prompt-share |
                                                            skill-file-market | qna | free

  npx @scaila/camp-cli scaffold <name> [--type web|minimal]
                                                  자기 서비스 시작용 스캐폴드 (.harness/ 통째 + spec.md)

환경 변수:
  CAMP_BASE_URL    기본 https://camp.scaila.kr  (로컬 dev: http://localhost:3000)
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.version) { console.log(VERSION); return; }
  if (args.help && args._.length === 0) { printHelp(); return; }

  const cmd = args._.shift();

  try {
    switch (cmd) {
      case undefined: {
        const { default: runWizard } = await import("../lib/wizard.js");
        await runWizard();
        return;
      }
      case "doctor": {
        const { default: doctor } = await import("../lib/commands/doctor.js");
        await doctor();
        return;
      }
      case "login": {
        const { default: login } = await import("../lib/commands/login.js");
        await login({ code: args.code, force: args.force });
        return;
      }
      case "logout": {
        const { default: logout } = await import("../lib/commands/logout.js");
        await logout({ yes: args.yes });
        return;
      }
      case "init": {
        const { default: init } = await import("../lib/commands/init.js");
        await init({ folder: args.folder, interactive: !args.yes });
        return;
      }
      case "status": {
        const { default: status } = await import("../lib/commands/status.js");
        await status();
        return;
      }
      case "assignment":
      case "assignments": {
        const { default: assignment } = await import("../lib/commands/assignment.js");
        await assignment(args._.shift(), args);
        return;
      }
      case "community": {
        const { default: community } = await import("../lib/commands/community.js");
        await community(args._.shift(), args);
        return;
      }
      case "scaffold": {
        const { default: scaffold } = await import("../lib/commands/scaffold.js");
        await scaffold(args);
        return;
      }
      default:
        fail(`알 수 없는 명령: ${cmd}`);
        printHelp();
        process.exit(2);
    }
  } finally {
    closePrompt();
  }
}

main().catch((err) => {
  closePrompt();
  console.error();
  console.error(`✗ ${err?.message || err}`);
  if (err?.stack && process.env.CAMP_DEBUG) console.error(err.stack);
  process.exit(1);
});
