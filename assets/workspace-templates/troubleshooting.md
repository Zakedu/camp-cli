# 문제 해결

## `node` / `npx` 명령을 못 찾는다고 나옴
- Node.js LTS 가 없을 가능성. [nodejs.org](https://nodejs.org/ko) 에서 LTS 설치.
- 설치 후 **터미널을 완전히 닫았다 다시 열어야** PATH가 적용됨.

## "토큰이 만료됐습니다" / 401
- 토큰이 만료(기본 14일)되었거나 관리자가 회수.
- 대시보드 [터미널 연결] 카드에서 새 코드를 받아 `npx @scaila/camp-cli login` 다시.

## 코드를 넣어도 "코드를 찾을 수 없습니다"
- 대문자/숫자만 들어가는지 확인 (`O`/`0`, `I`/`1` 헷갈리기 쉬움).
- 대시보드 카드를 새로고침하면 새 코드가 나옴 (이전 코드는 무효).

## 자료 다운로드가 0바이트
- 네트워크 확인. VPN 켜져 있으면 끄고 재시도.
- `npx @scaila/camp-cli init` 다시 (멱등 — 누락분만 채움).

## "이대로 제출할까요?" 에서 뭘 확인해야 하나
- 미리보기에 회사/팀/이름이 맞는지.
- `outputs/<file>.md` 가 본인이 작성한 최신본인지.
- 완료 기준(acceptanceCriteria)을 다 충족했는지.

## Claude Code / Codex 가 멈춘 것 같을 때
- Ctrl+C 로 중지.
- `npx @scaila/camp-cli status` 직접 실행해서 상태 확인.
- `npx @scaila/camp-cli doctor` 로 환경 점검.

## 그래도 막히면
운영팀에 다음 정보와 함께 문의:
- OS / 버전 (예: macOS 14, Windows 11)
- `npx @scaila/camp-cli doctor` 출력 전체
- 실행한 명령어와 에러 메시지 전문
