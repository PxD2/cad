#!/usr/bin/env node
/**
 * Static SPA for GitHub Pages at https://pxd2.github.io/cad/
 * Separate from the TanStack Start / Nitro Vercel build.
 */
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const build = spawnSync(
  "node",
  ["scripts/with-app-env.mjs", "vite", "build", "--config", "vite.pages.config.ts"],
  { cwd: root, env: { ...process.env, GITHUB_PAGES: "1" }, stdio: "inherit" },
);
if (build.status !== 0) process.exit(build.status ?? 1);

const dest = join(root, "pages-dist");
const index = join(dest, "index.html");
if (!existsSync(index)) {
  console.error("[pages] missing", index);
  process.exit(1);
}
copyFileSync(index, join(dest, "404.html"));
writeFileSync(join(dest, ".nojekyll"), "");
console.log("[pages] wrote", dest);
