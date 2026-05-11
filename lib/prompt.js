// readline 인터랙티브 헬퍼.

import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

let rl = null;

function getRl() {
  if (!rl) rl = readline.createInterface({ input, output });
  return rl;
}

export function closePrompt() {
  if (rl) { try { rl.close(); } catch { /* ignore */ } rl = null; }
}

export async function ask(question, { defaultValue = "" } = {}) {
  const hint = defaultValue ? `  [${defaultValue}]` : "";
  const answer = await getRl().question(`  ${question}${hint}: `);
  return answer.trim() || defaultValue;
}

export async function confirm(question, { defaultYes = false } = {}) {
  const hint = defaultYes ? "(Y/n)" : "(y/N)";
  const answer = (await getRl().question(`  ${question} ${hint}: `)).trim().toLowerCase();
  if (!answer) return defaultYes;
  return /^y(es)?$/.test(answer);
}

export async function askPassword(question) {
  // Simple — readline doesn't mask. For setup code, masking isn't critical.
  return ask(question);
}
