# @scaila/camp-cli

AI CAMP 학생용 터미널 도우미. Codex / Claude Code 와 함께 쓰는 동반 CLI.

## 학생 (소비)

```bash
npx @scaila/camp-cli@latest                 # 5스텝 마법사
npx @scaila/camp-cli doctor                 # 환경 점검
npx @scaila/camp-cli login                  # 6자리 코드 → 토큰
npx @scaila/camp-cli status                 # 현재 주차/자료/과제
npx @scaila/camp-cli assignment submit ch2-pre --file outputs/ch2-pre.md --yes
npx @scaila/camp-cli community post --board assignment-share --title "..." --file outputs/x.md --yes
```

## 자기 서비스 시작 (생산)

```bash
npx @scaila/camp-cli scaffold my-service --type web
cd my-service
claude    # 또는 codex
```
→ `spec.md` · `.harness/` (design-library 통째) · `tokens.css` · `CLAUDE.md` 깔림. 에이전트한테 `"checklist 8차원 짚어줘"` 한 마디.

## 로컬 테스트 (publish 전)

```bash
# 1. 이 폴더에서
cd ~/Projects/camp-cli
npm link                            # 글로벌 심링크
camp-cli doctor                     # 글로벌 명령으로 작동 확인
camp-cli --version

# 2. 또는 file: 경로로 npx
cd /tmp && mkdir test-camp && cd test-camp
npx /Users/ga/Projects/camp-cli doctor

# 3. 다른 서버 가리키기 (로컬 dev 등)
CAMP_BASE_URL=http://localhost:3000 camp-cli doctor

# 4. 디버그
CAMP_DEBUG=1 camp-cli login
```

## 환경 변수

| 변수 | 기본 | 설명 |
|---|---|---|
| `CAMP_BASE_URL` | `https://camp.scaila.kr` | 서버 URL (`http://localhost:3000` 같은 dev 환경) |
| `CAMP_DEBUG` | `(unset)` | 스택트레이스 출력 |

## 자격증명 저장 위치

`~/.camp/credentials.json` (mode `0600`). 노출 시 즉시 `logout` + 관리자에게 토큰 회수 요청.

## 의존성

`dependencies` 없음 — Node 내장 모듈만 사용.

## 라이선스

UNLICENSED (내부용)
