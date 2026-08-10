/**
 * Emphasis check: bold and italic markers must actually resolve to markup.
 *
 * Written because eleven emphasis delimiters across six pages had drifted to the
 * wrong side of a <br />, and the pages kept building. Three shapes were found,
 * all on content the CMS had saved:
 *
 *   1. Escaped delimiters. `G10. \*\*Achievement in Business & Office
 *      Supplies<br />\*\*Business cards…` — markdown emits a literal `*`, so the
 *      category name showed raw asterisks and was never bold.
 *      (achievement-in-marketing-categories.mdx, event-categories.mdx,
 *      press/photos-and-logos.mdx)
 *
 *   2. A closer that cannot close. `**2\. Written answers…:<br />**a. The date…`
 *      — after a `<br />` the `**` is left-flanking only, so per CommonMark it can
 *      open emphasis but never close it. Both delimiters render literally.
 *      (podcast-categories.mdx)
 *
 *   3. A missing delimiter, which makes emphasis run on until the next one it can
 *      pair with. `*<u>BRONZE STEVIE® WINNER</u>Award Writing Services…` was
 *      missing its closing `*`, so one italic swallowed 530 characters of winner
 *      listings. The nastiest part: five labels were also missing their *opening*
 *      `*`, and the two faults cancelled — each orphaned opener paired with a
 *      later orphaned closer, so no literal asterisk appeared anywhere and the
 *      only symptom was a large block wrongly italicised.
 *      (IBA-Winners/2025 winners page, lines 92, 98, 122, 128, 194)
 *
 * The cause is structural, the same one described in check-anchors.js: page bodies
 * are exposed to CloudCannon as a single rich-text region and
 * cloudcannon.config.yml sets `_editables.content.allow_custom_markup: false`, so
 * a save re-serialises inline markup. Emphasis that overlaps a `<br />` has no
 * clean markdown representation, and the serialiser guesses.
 *
 * This runs against the source rather than the built HTML, unlike check-anchors.js.
 * The defect lives in the delimiters, so the source gives an actionable file:line;
 * the built page just quietly lacks a <strong> with nothing to point at. It also
 * means the check needs no build.
 *
 * Shape 3 is why "no literal asterisks" is not a sufficient test on its own. The
 * structural checks below cover it: in clean content no italic spans a line break
 * at all (0 of 1,016), so an italic that does is a run-on.
 *
 * Usage:
 *   node scripts/check-emphasis.js            # report only, exit 0
 *   node scripts/check-emphasis.js --strict   # exit 1 on any broken emphasis
 *   node scripts/check-emphasis.js <dir>      # check a subtree instead of src/content
 *
 * Report-only by default, matching check-anchors.js and check-image-alt.js:
 * CloudCannon runs the production build, so a hard failure here would stop the
 * site deploying.
 */

import fs from "fs";
import path from "path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import { visit } from "unist-util-visit";

const STRICT = process.argv.includes("--strict");
const CONTENT = process.argv.slice(2).find((arg) => !arg.startsWith("-")) ?? "src/content";

// Bold legitimately wraps a run of lines in this content — the "Information to be
// submitted online…" blocks on the category pages span up to four breaks. Only
// flag bold well past that. Italic gets no allowance: see the header.
const BOLD_BREAK_LIMIT = 5;

function contentFiles(dir) {
  const found = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) found.push(...contentFiles(full));
    else if (/\.mdx?$/.test(entry.name)) found.push(full);
  }

  return found;
}

// Frontmatter is YAML, not markdown, and parsing it as markdown invents nodes.
// Strip it but keep the line count so reported positions match the real file.
function stripFrontmatter(raw) {
  const match = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);

  if (!match) return { body: raw, offset: 0 };

  return { body: raw.slice(match[0].length), offset: match[0].split("\n").length - 1 };
}

// Only .mdx goes through the MDX extension; a .md file's tags are plain HTML and
// MDX would reject anything that is not valid JSX.
const mdx = unified().use(remarkParse).use(remarkMdx);
const md = unified().use(remarkParse);

function breakCount(node) {
  let breaks = 0;

  visit(node, (child) => {
    if (child.type === "mdxJsxTextElement" && child.name === "br") breaks++;
    if (child.type === "html" && /^<br\s*\/?>$/i.test(child.value)) breaks++;
  });

  return breaks;
}

function textOf(node) {
  let text = "";

  visit(node, (child) => {
    if (child.type === "text") text += child.value;
  });

  return text;
}

const literals = new Map();
const wordSplits = new Map();
const runOnItalics = new Map();
const wideBolds = new Map();
const unparsed = [];

if (!fs.existsSync(CONTENT)) {
  console.error(`No ${CONTENT}/ directory.`);
  process.exit(1);
}

const files = contentFiles(CONTENT);

for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  const { body, offset } = stripFrontmatter(raw);
  const at = (node) => `${file}:${node.position.start.line + offset}`;

  let tree;

  try {
    tree = (file.endsWith(".mdx") ? mdx : md).parse(body);
  } catch (error) {
    unparsed.push(`${file}  ${error.message.split("\n")[0]}`);
    continue;
  }

  const push = (map, key, value) => {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(value);
  };

  // A `*` that survives into rendered text is a delimiter that failed to pair.
  visit(tree, "text", (node) => {
    if (!node.value.includes("*")) return;

    const index = node.value.indexOf("*");
    const snippet = node.value.slice(Math.max(0, index - 30), index + 40).replace(/\s+/g, " ");

    push(literals, file, `${at(node)}  …${snippet}…`);
  });

  visit(tree, (node, index, parent) => {
    if (node.type !== "strong" && node.type !== "emphasis") return;

    const breaks = breakCount(node);

    // `**Transportation<br />I**ncluding e-mobility…`: the closer landed one
    // character late, so the bold ate the next word's first letter and the
    // sentence rendered as "ncluding e-mobility…".
    const next = parent?.children[index + 1];

    if (next?.type === "text" && /^[a-z]/.test(next.value)) {
      push(
        wordSplits,
        file,
        `${at(node)}  <${node.type}> ends "…${textOf(node).slice(-20)}" then "${next.value.slice(0, 20)}…"`
      );
      return;
    }

    if (node.type === "emphasis" && breaks > 0) {
      push(
        runOnItalics,
        file,
        `${at(node)}  italic spans ${breaks} line break(s), ${textOf(node).length} chars`
      );
      return;
    }

    if (node.type === "strong" && breaks >= BOLD_BREAK_LIMIT) {
      push(wideBolds, file, `${at(node)}  bold spans ${breaks} line breaks`);
    }
  });
}

const section = (title, map) => {
  if (!map.size) return;
  console.log(`\n${title}`);
  for (const [, entries] of map) for (const entry of entries) console.log(`  ${entry}`);
};

console.log(`Checked ${files.length} content file(s) in ${CONTENT}/`);

section("Literal asterisks in rendered text (delimiter never paired):", literals);
section("Emphasis boundary splits a word:", wordSplits);
section("Italic spanning a line break (run-on emphasis):", runOnItalics);
section(`Bold spanning ${BOLD_BREAK_LIMIT}+ line breaks (review, may be intentional):`, wideBolds);

if (unparsed.length) {
  console.log("\nCould not parse:");
  for (const entry of unparsed) console.log(`  ${entry}`);
}

const count = (map) => [...map.values()].reduce((n, v) => n + v.length, 0);
const broken = count(literals) + count(wordSplits) + count(runOnItalics);

if (!broken && !count(wideBolds)) {
  console.log("\nAll bold and italic markers resolve to markup.");
  process.exit(0);
}

console.log(
  `\n${count(literals)} literal asterisk(s), ${count(wordSplits)} split word(s), ` +
    `${count(runOnItalics)} run-on italic(s), ${count(wideBolds)} wide bold(s) to review.`
);

if (STRICT && broken) process.exit(1);
