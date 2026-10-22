import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { releaseFiles } from "./release-files.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const names = await releaseFiles(root);
const required = [".env.example", "README.md", "LICENSE", "THIRD_PARTY_NOTICES.md", "package-lock.json", "public/fonts/OFL-NotoSansSC.txt"];
let failures = 0;
function report(name, rule, line) {
  failures++;
  // Report locations only; never echo a matching credential or private value.
  console.error(`${name}${line ? `:${line}` : ""}: ${rule}`);
}
for (const name of required) if (!names.includes(name)) report(name, "required release file is missing");
const checks = [
  ["possible API credential", /sk-(?:studio-)?[a-zA-Z0-9]{20,}/],
  ["private hosting identifier", /appg(?:prj|dep|ver)_[a-zA-Z0-9_]+/],
  ["local absolute path", /\/(?:Users|home)\/[^/\s]+\/|\/var\/folders\//],
  ["private key material", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
];
for (const name of names) {
  if (/(^|\/)(?:\.env(?!\.example$)|\.dev\.vars|\.git|node_modules|evidence|recordings)(\/|$)/.test(name)) report(name, "private or generated path");
  const content = await readFile(path.join(root, name), "utf8");
  for (const [i, line] of content.split("\n").entries()) {
    for (const [rule, pattern] of checks) if (pattern.test(line)) report(name, rule, i + 1);
    if (/^[ \t]*(?:MING_API_KEY|APP_PASSWORD)[ \t]*=[ \t]*[^#\s]/.test(line)) report(name, "populated environment assignment", i + 1);
  }
}
const manifest = JSON.parse(await readFile(path.join(root, "public/media/voice/v2/manifest.json"), "utf8"));
for (const entry of manifest) {
  const relative = entry.file.replace(/^\//, "public/");
  if (!names.includes(relative)) { report(relative, "voice clip missing"); continue; }
  if ((await stat(path.join(root, relative))).size !== entry.bytes) report(relative, "voice clip size differs from manifest");
}
if (failures) process.exitCode = 1;
else console.log(`Release audit passed: ${names.length} allowlisted files, ${manifest.length} fixed synthetic voice clips. No credential pattern or private deployment data found.`);
