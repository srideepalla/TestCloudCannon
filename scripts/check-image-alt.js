/**
 * Accessibility check: every image in content must declare alt text.
 *
 * WCAG 1.1.1 Non-text Content. The Image component normalises alt with
 * `alt || ""`, and an empty alt is a *meaningful* signal — it tells assistive
 * technology the image is decorative and should be skipped. Because a missing
 * value renders identically to a deliberate one, an image published without alt
 * text is silently inaccessible and nothing in the build flags it.
 *
 * This script closes that gap. An image is considered accounted for when its
 * containing block declares an `alt` key. To mark an image as genuinely
 * decorative, set `alt: ""` explicitly — that is a deliberate choice and passes.
 *
 * Usage:
 *   node scripts/check-image-alt.js                # report only, always exit 0
 *   node scripts/check-image-alt.js --strict       # exit 1 when images lack alt
 *   node scripts/check-image-alt.js --locales      # include src/content/pages/<locale>/
 *
 * Report-only by default on purpose: CloudCannon runs the production build, so a
 * hard failure here would stop the site deploying. Promote to --strict in CI
 * once the existing content is clean.
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";

const STRICT = process.argv.includes("--strict");
const INCLUDE_LOCALES = process.argv.includes("--locales");

const CONTENT = "src/content";
const LOCALE_DIR = path.join(CONTENT, "pages");

// Keys whose value is a path for an image that actually renders as an <img>.
// Deliberately excludes `image`: that is the SEO/Open Graph image, which is
// never rendered in the page, so alt text does not apply to it. (Missing
// og:image:alt is a separate concern from WCAG 1.1.1.)
const IMAGE_KEYS = new Set(["source", "logoSource"]);

function isLocalePath(file) {
  const rel = path.relative(LOCALE_DIR, file);

  if (rel.startsWith("..")) return false;
  const first = rel.split(path.sep)[0];

  // A locale directory is a subdirectory of pages/; top-level files are English.
  return first && !first.endsWith(".md") && !first.endsWith(".mdx");
}

function collectFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) collectFiles(full, out);
    else if (/\.mdx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

function frontmatter(text) {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);

  if (end === -1) return null;
  try {
    return yaml.load(text.slice(3, end));
  } catch {
    return null; // malformed frontmatter is a separate problem, not ours
  }
}

/** Walk the parsed frontmatter, reporting image values whose block has no alt. */
function findMissing(node, trail, missing) {
  if (Array.isArray(node)) {
    node.forEach((child, i) => findMissing(child, `${trail}[${i}]`, missing));
    return;
  }
  if (!node || typeof node !== "object") return;

  const keys = Object.keys(node);
  const hasAlt = keys.includes("alt");

  for (const key of keys) {
    const value = node[key];

    // An image key holding a non-empty string path, in a block with no alt key.
    if (IMAGE_KEYS.has(key) && typeof value === "string" && value.trim() !== "") {
      if (!hasAlt) missing.push({ at: trail ? `${trail}.${key}` : key, src: value.trim() });
    }
    findMissing(value, trail ? `${trail}.${key}` : key, missing);
  }
}

/**
 * Scan the markdown/MDX body, which frontmatter parsing never sees. Three
 * syntaxes can carry an image here and all three were previously invisible to
 * this check, so it reported "clean" while hundreds of body images had no alt.
 */
function findBodyMissing(text, missing) {
  const end = text.startsWith("---") ? text.indexOf("\n---", 3) : -1;
  const body = end > -1 ? text.slice(end + 4) : text;

  for (const m of body.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt\s*=/i.test(m[0])) missing.push({ at: "body <img>", src: m[0].slice(0, 90) });
  }
  for (const m of body.matchAll(/<Image\b[^>]*>/g)) {
    if (!/\balt\s*=/.test(m[0])) missing.push({ at: "body <Image>", src: m[0].slice(0, 90) });
  }
  // Markdown image syntax: the text between the brackets IS the alt.
  for (const m of body.matchAll(/!\[([^\]]*)\]\(([^)]*)\)/g)) {
    if (!m[1].trim()) missing.push({ at: "body ![](…)", src: m[2].slice(0, 90) });
  }
}

const files = collectFiles(CONTENT).filter((f) => INCLUDE_LOCALES || !isLocalePath(f));

let offending = 0;
let total = 0;
const report = [];

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const data = frontmatter(text);
  const missing = [];

  // Files with no (or malformed) frontmatter still have a body worth checking.
  if (data) findMissing(data, "", missing);
  findBodyMissing(text, missing);

  total += missing.length;
  if (missing.length) {
    offending++;
    report.push({ file: file.split(path.sep).join("/"), missing });
  }
}

const scope = INCLUDE_LOCALES ? "all content" : "English content";

console.log(`\nImage alt check — ${scope}: ${files.length} files scanned`);

if (!total) {
  console.log("✓ Every image declares alt text.\n");
  process.exit(0);
}

console.log(`✗ ${total} image(s) without alt text, across ${offending} file(s):\n`);
for (const { file, missing } of report) {
  console.log(`  ${file}`);
  for (const m of missing.slice(0, 10)) {
    console.log(`      ${m.at}  →  ${m.src.slice(0, 90)}`);
  }
  if (missing.length > 10) console.log(`      ...and ${missing.length - 10} more`);
}
console.log(
  `\nAdd alt text, or set alt: "" to declare the image decorative.${
    STRICT ? "" : "\n(Report-only. Pass --strict to make this fail.)\n"
  }`
);

process.exit(STRICT ? 1 : 0);
