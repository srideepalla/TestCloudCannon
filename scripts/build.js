/**
 * Cross-platform production build.
 *
 * The build needs DISABLE_COMPONENT_LIBRARY=true, which gates component-docs
 * route generation in three page files (src/pages/component-docs/[...slug].astro,
 * .../components/[...slug].astro, .../component-builder.astro). Without it the
 * internal component library is published to the public site.
 *
 * The old script set it with POSIX `VAR=value cmd` syntax, which cmd.exe rejects
 * outright — so `npm run build` failed on Windows before Astro even started, and
 * piping the output made it look like a success. Setting the variable in Node
 * instead works identically on every platform and needs no extra dependency.
 *
 * Any extra arguments are forwarded to `astro build`.
 */

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const astroPackage = require.resolve("astro/package.json");
const astroBin = path.join(path.dirname(astroPackage), "bin", "astro.mjs");

const result = spawnSync(process.execPath, [astroBin, "build", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, DISABLE_COMPONENT_LIBRARY: "true" },
});

if (result.error) {
  console.error(`Failed to start Astro: ${result.error.message}`);
  process.exit(1);
}

// Propagate the real exit code so CI and CloudCannon see genuine failures.
process.exit(result.status ?? 1);
