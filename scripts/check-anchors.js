/**
 * Link check: every in-page jump link must land on a real target.
 *
 * Written because the FAQ's anchors have now been destroyed four times, and each
 * time the page kept rendering perfectly — the table of contents still looked
 * like a list of links, they just stopped going anywhere. Nothing in the build
 * noticed. See src/content/about/faq.mdx.
 *
 * The cause is structural, not a one-off mistake. Page bodies are exposed to
 * CloudCannon as a single rich-text region (data-editable="text" on the Text
 * component), and cloudcannon.config.yml sets `_editables.content.allow_custom_markup:
 * false` with a `format` allowlist of `p h1..h6` — no `span`. An anchor target
 * renders as an *empty* <span id>, so a CMS save on such a page can drop it with
 * nothing left behind to notice. Commits 6681e3fdf, c08e9b186 and 62c0d16bf each
 * did exactly that, and 62c0d16bf also rewrote the surviving fragments to
 * absolute URLs, which reload the page instead of jumping within it.
 *
 * This runs against the built HTML rather than the source on purpose: heading
 * slugs are generated at build time, so `[Europe](#europe)` pointing at a heading
 * that slugifies to `europe-other-than-türkiye-and-the-united-kingdom` is only
 * visible after rendering. That exact break is live on the contact page today.
 *
 * Duplicate ids are reported too (WCAG 4.1.1): when two elements share an id the
 * jump target is whichever the browser happens to find first, so the link is
 * unreliable rather than plainly broken.
 *
 * Usage:
 *   npm run build && node scripts/check-anchors.js            # report only, exit 0
 *   npm run build && node scripts/check-anchors.js --strict   # exit 1 on any break
 *
 * Report-only by default, matching check-image-alt.js: CloudCannon runs the
 * production build, so a hard failure here would stop the site deploying.
 * Promote to --strict in CI once the existing content is clean.
 */

import fs from "fs";
import path from "path";

const STRICT = process.argv.includes("--strict");
const DIST = "dist";

// Fragments that are navigation affordances rather than content targets. "#" and
// "#!" are placeholder hrefs; they are a separate defect (a link that goes
// nowhere at all) and are reported under their own heading.
const PLACEHOLDERS = new Set(["", "!"]);

function htmlFiles(dir) {
  const found = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) found.push(...htmlFiles(full));
    else if (entry.name.endsWith(".html")) found.push(full);
  }

  return found;
}

// An href may be percent-encoded while the id it targets is not, so compare both
// forms. decodeURIComponent throws on a malformed sequence such as a lone "%".
function candidates(fragment) {
  const forms = new Set([fragment]);

  try {
    forms.add(decodeURIComponent(fragment));
  } catch {
    // Malformed encoding: the raw form is all we can match on.
  }

  return forms;
}

const brokenByFile = new Map();
const duplicatesByFile = new Map();
const placeholdersByFile = new Map();

if (!fs.existsSync(DIST)) {
  console.error(`No ${DIST}/ directory. Run \`npm run build\` first.`);
  process.exit(1);
}

const pages = htmlFiles(DIST);

for (const file of pages) {
  const html = fs.readFileSync(file, "utf8");

  const ids = [...html.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1]);
  const idSet = new Set(ids);
  const fragments = [...html.matchAll(/href="#([^"]*)"/g)].map((m) => m[1]);

  const seen = new Set();
  const duplicates = new Set();

  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  if (duplicates.size) duplicatesByFile.set(file, [...duplicates]);

  const placeholders = fragments.filter((f) => PLACEHOLDERS.has(f));

  if (placeholders.length) placeholdersByFile.set(file, placeholders.length);

  const broken = [
    ...new Set(
      fragments
        .filter((f) => !PLACEHOLDERS.has(f))
        .filter((f) => ![...candidates(f)].some((c) => idSet.has(c)))
    ),
  ];

  if (broken.length) brokenByFile.set(file, broken);
}

const section = (title, map, render) => {
  if (!map.size) return;
  console.log(`\n${title}`);
  for (const [file, value] of map) console.log(`  ${file}\n    ${render(value)}`);
};

console.log(`Checked ${pages.length} built page(s) in ${DIST}/`);

section("Jump links with no matching id:", brokenByFile, (v) =>
  v.map((f) => `#${f}`).join("\n    ")
);
section("Duplicate ids (jump target is ambiguous):", duplicatesByFile, (v) =>
  v.map((id) => `id="${id}"`).join("\n    ")
);
section('Placeholder href="#" links (go nowhere):', placeholdersByFile, (n) => `${n} link(s)`);

const brokenCount = [...brokenByFile.values()].reduce((n, v) => n + v.length, 0);
const duplicateCount = [...duplicatesByFile.values()].reduce((n, v) => n + v.length, 0);

if (!brokenCount && !duplicateCount && !placeholdersByFile.size) {
  console.log("\nAll in-page links resolve to a unique target.");
  process.exit(0);
}

console.log(
  `\n${brokenCount} unresolved link(s), ${duplicateCount} duplicate id(s), ` +
    `${placeholdersByFile.size} page(s) with placeholder links.`
);

if (STRICT && (brokenCount || duplicateCount)) process.exit(1);
