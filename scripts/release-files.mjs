import { readdir } from "node:fs/promises";
import path from "node:path";

// An explicit allowlist keeps local secrets, test recordings and build output out.
const roots = new Set(["app", "components", "lib", "public", "tests", "docs", "scripts", ".github"]);
const files = new Set([".env.example", ".gitignore", ".editorconfig", "package.json", "package-lock.json", "next.config.ts", "next-env.d.ts", "postcss.config.mjs", "tsconfig.json", "proxy.ts", "README.md", "LICENSE", "THIRD_PARTY_NOTICES.md", "CONTRIBUTING.md", "SECURITY.md", "CHANGELOG.md"]);

export async function releaseFiles(root) {
  const result = [];
  async function walk(directory, prefix = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (!prefix && !roots.has(entry.name) && !files.has(entry.name)) continue;
      if (entry.isSymbolicLink()) throw new Error(`Symbolic link is not release-safe: ${relative}`);
      if (entry.isDirectory()) await walk(path.join(directory, entry.name), relative);
      else if (entry.isFile()) result.push(relative);
    }
  }
  await walk(root);
  return result.sort();
}
