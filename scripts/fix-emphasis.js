/**
 * Emphasis fixer: the autofix counterpart to check-emphasis.js.
 *
 * check-emphasis.js reports broken emphasis; it does not touch source. This
 * script rewrites the one shape that is safe to fix mechanically — the
 * Word-paste run produced when a stack of Word paragraphs (bold category,
 * italic-underlined award, plain winner line, blank) collapses into a single
 * Markdown paragraph with `<br />` between them:
 *
 *   **Category <br />***<u>GOLD STEVIE® WINNER</u><br />*Winner line<br />**<br />NextCategory <br />***<u>...
 *
 * Reads each malformed paragraph, splits on `<br />`, strips stray delimiter
 * runs (`*`, `**`, `***`) at the ends of each fragment, and classifies each
 * piece as an award line (contains `<u>...</u>`), a header (text before an
 * award), or a winner (text after an award). Then re-emits the block as
 * proper Markdown paragraphs with `<strong>` / `<em><u>` inline HTML so the
 * Markdown parser has no asterisks left to misinterpret. Uses Markdown
 * hard-breaks (two trailing spaces + newline) between winner sub-lines so
 * they render as `<br>` inside a real `<p>` and pick up the site's normal
 * body-text sizing.
 *
 * Only the Word-paste shape is rewritten. Shapes 1–3 from check-emphasis.js
 * (escaped delimiters, uncloseable closers, missing delimiters) either need
 * human judgement about intent, or are already caught by the checker as
 * report-only.
 *
 * Usage:
 *   node scripts/fix-emphasis.js              # rewrite in place under src/content
 *   node scripts/fix-emphasis.js --dry-run    # report what would change, write nothing
 *   node scripts/fix-emphasis.js <dir>        # scope to a subtree instead of src/content
 */

import fs from "fs";
import path from "path";

const DRY = process.argv.includes("--dry-run");
const CONTENT = process.argv.slice(2).find((arg) => !arg.startsWith("-")) ?? "src/content";

// A single-paragraph line that starts with `**`, contains at least one
// `<br />`, and then a `***<u>` or `*<u>` — the signature of a paste that
// collapsed a Word category block onto one line.
const MALFORMED = /^\*\*[^\n]*<br\s*\/?>\*{1,3}<u>[^\n]*$/gm;

function contentFiles(dir) {
  const found = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) found.push(...contentFiles(full));
    else if (/\.mdx?$/.test(entry.name)) found.push(full);
  }

  return found;
}

function fixBlock(raw) {
  const parts = raw.split(/<br\s*\/?>/i).map((s) => s.trim());

  const items = parts.map((part) => {
    // The paste litters fragments with 1–3 leading/trailing `*` markers left
    // over from Word's bold/italic runs. Strip them so we can classify by
    // what the fragment actually contains.
    const stripped = part.replace(/^\*{1,3}/, "").replace(/\*{1,3}$/, "").trim();

    if (!stripped) return { kind: "blank" };

    const u = stripped.match(/<u>(.*?)<\/u>/i);
    if (u) return { kind: "award", text: u[1].trim() };

    return { kind: "text", text: stripped };
  });

  const paragraphs = [];
  let i = 0;

  while (i < items.length) {
    while (i < items.length && items[i].kind === "blank") i++;
    if (i >= items.length) break;

    let header = null;

    if (items[i].kind === "text") {
      header = items[i].text;
      i++;
    }

    const pairs = [];

    while (i < items.length && items[i].kind !== "blank") {
      if (items[i].kind === "award") {
        const award = items[i].text;
        i++;

        const winnerLines = [];

        while (i < items.length && items[i].kind === "text") {
          winnerLines.push(items[i].text);
          i++;
          if (i < items.length && items[i].kind === "award") break;
        }

        pairs.push({ award, winner: winnerLines.join(" ") });
      } else {
        // Stray text with no preceding award. Attach it wherever it makes
        // most sense: to the last winner, or to the header if no pairs yet.
        if (pairs.length) pairs[pairs.length - 1].winner += " " + items[i].text;
        else if (header) header += " " + items[i].text;
        else header = items[i].text;
        i++;
      }
    }

    if (!header && !pairs.length) continue;

    if (header) paragraphs.push(`<strong>${header}</strong>`);

    if (pairs.length) {
      const lines = pairs.flatMap((p) => [`<em><u>${p.award}</u></em>`, p.winner]);
      // Hard-break between sub-lines: two trailing spaces + newline. Keeps
      // the award and winner tight inside one `<p>` (correct spacing) while
      // still letting Markdown emit a real paragraph.
      paragraphs.push(lines.join("  \n"));
    }
  }

  return paragraphs.join("\n\n");
}

if (!fs.existsSync(CONTENT)) {
  console.error(`No ${CONTENT}/ directory.`);
  process.exit(1);
}

const files = contentFiles(CONTENT);
const changed = [];

for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  const next = raw.replace(MALFORMED, (match) => fixBlock(match));

  if (next === raw) continue;

  changed.push(file);
  if (!DRY) fs.writeFileSync(file, next);
}

console.log(`Scanned ${files.length} content file(s) in ${CONTENT}/.`);

if (!changed.length) {
  console.log("No malformed Word-paste blocks found.");
  process.exit(0);
}

console.log(`\n${DRY ? "Would rewrite" : "Rewrote"} ${changed.length} file(s):`);
for (const file of changed) console.log(`  ${file}`);

if (DRY) console.log("\nRun without --dry-run to apply.");
