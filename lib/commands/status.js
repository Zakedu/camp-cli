import { apiGet } from "../api.js";
import { info, ok, dim, bold } from "../log.js";

export default async function status() {
  const boot = await apiGet("/api/course/bootstrap");
  console.log();
  info(`학생: ${bold(boot.student.name)}  ·  ${boot.student.group}`);
  console.log(`  ${dim("코호트:")} ${boot.cohort.name}`);
  console.log(`  ${dim("진행:")} ${boot.course.currentWeek}강 / 총 ${boot.course.totalWeeks}강`);

  console.log();
  console.log(`  ${bold("이번 주 자료")}`);
  for (const m of boot.materials || []) {
    console.log(`    · [${m.type}] ${m.title}`);
  }
  if ((boot.materials || []).length === 0) console.log(`    ${dim("(없음)")}`);

  console.log();
  console.log(`  ${bold("이번 주 과제")}`);
  for (const a of boot.assignments || []) {
    const mark = a.submitted ? ok : (() => {});
    const tag = a.submitted ? "[제출 완료]" : dim("[미제출]");
    console.log(`    ${tag} ${a.id} — ${a.title}`);
    mark();
  }
  if ((boot.assignments || []).length === 0) console.log(`    ${dim("(없음)")}`);
  console.log();
}
