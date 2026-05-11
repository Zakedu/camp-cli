// Tiny color helpers — ANSI only, no deps.

const isTTY = process.stdout.isTTY;
const c = (code) => (s) => (isTTY ? `\x1b[${code}m${s}\x1b[0m` : String(s));

export const dim = c("2");
export const bold = c("1");
export const red = c("31");
export const green = c("32");
export const yellow = c("33");
export const blue = c("34");
export const magenta = c("35");
export const cyan = c("36");

export const ok = (msg) => console.log(`${green("✓")} ${msg}`);
export const warn = (msg) => console.log(`${yellow("·")} ${msg}`);
export const fail = (msg) => console.log(`${red("✗")} ${msg}`);
export const info = (msg) => console.log(`${cyan("▸")} ${msg}`);
export const step = (n, total, label) =>
  console.log(`\n${cyan(`▸ ${n}/${total}`)}  ${bold(label)}`);
export const hr = () => console.log(dim("─".repeat(48)));
