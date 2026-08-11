/**
 * Emphasis fixer: the autofix counterpart to check-emphasis.js.
 *
 * check-emphasis.js reports broken emphasis; it does not touch source. This
 * script rewrites the one shape that is safe to fix mechanically — the
 * Word-paste run produced when a stack of Word paragraphs (bold category,
 * italic-underlined award, plain winner line, blank) collapses into a single
 * Markdown paragraph, whose smoking-gun signature is 3 or more asterisks
 * glued to `<u>` right after a `<br />` (a `**`-close bolt-onto a `*`-open
 * italic, with no space to separate them):
 *
 *   **Category <br />***<u>GOLD STEVIE® WINNER</u><br />*Winner line<br />**<br />Next Category <br />***<u>...
 *
 * The tight signature deliberately excludes well-formed pages that use
 * `**Header**<br />*<u>AWARD</u>*<br />...` — bold and italic each properly
 * closed with a single asterisk each side, no glued run — because those are
 * NOT the Word-paste breakage and this fixer's re-parse would flatten their
 * multi-winner shape. If a file's problem is not the Word-paste run, the
 * fixer intentionally leaves it alone; check-emphasis.js still reports it,
 * and a human decides.
 *
 * Safety net: after rewriting a block, if the result still contains any
 * literal `*` character, the ENTIRE file is left untouched. Better to keep
 * the visible bug than corrupt the content. The refusal is reported.
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
// `<br />`, then 3+ asterisks glued directly to `<u>`. The 3+ requirement is
// what distinguishes the malformed Word paste from a well-formed
// `**Title**<br />*<u>Award</u>*` shape (which has exactly one `*` on the
// italic and would not be safe to run through this rewriter).
const MALFORMED = /^\*\*[^\n]*<br\s*\/?>\*{3,}<u>[^\n]*$/gm;

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
    // Word's paste leaves runs of any length (1–5+) at the ends of each
    // fragment — from bold+italic+underline combining. Strip any run,
    // including escaped `\*` sequences left by a prior serialisation pass.
    const stripped = part
      .replace(/^(?:\\?\*)+/, "")
      .replace(/(?:\\?\*)+$/, "")
      .trim();

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

        // Collect every winner line that follows this award, each preserved
        // as its own entry — an award may list 5–10 winners, one per line
        // in the source Word doc, and each must stay on its own visual line.
        const winners = [];

        while (i < items.length && items[i].kind === "text") {
          winners.push(items[i].text);
          i++;
          if (i < items.length && items[i].kind === "award") break;
        }

        pairs.push({ award, winners });
      } else {
        // Stray text with no preceding award. Attach it wherever it makes
        // most sense: to the last winner, or to the header if no pairs yet.
        if (pairs.length) {
          const last = pairs[pairs.length - 1].winners;
          if (last.length) last[last.length - 1] += " " + items[i].text;
          else last.push(items[i].text);
        } else if (header) header += " " + items[i].text;
        else header = items[i].text;
        i++;
      }
    }

    if (!header && !pairs.length) continue;

    if (header) paragraphs.push(`<strong>${header}</strong>`);

    if (pairs.length) {
      // Interleave award label and its winners. Every line inside the
      // paragraph gets a Markdown hard-break (two trailing spaces + newline)
      // so the browser sees a real `<br>` between each award/winner line
      // AND between two winners of the same award.
      const lines = pairs.flatMap((p) => [`<em><u>${p.award}</u></em>`, ...p.winners]);
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
const rewritten = [];
const refused = [];

for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  let refusalReason = null;

  const next = raw.replace(MALFORMED, (match) => {
    const fixed = fixBlock(match);

    // Safety: if the rewrite of this block still contains any literal `*`,
    // the fixer wasn't able to clean it. Keep the original block unchanged
    // — corruption is worse than a visible bug — and remember to refuse
    // the whole file.
    if (fixed.includes("*")) {
      refusalReason ??= "rewrite still contains literal '*'";
      return match;
    }

    return fixed;
  });

  // Refusal is a first-class outcome: report it even when `next === raw`,
  // which happens when every matched block was refused and the callback
  // returned the original text unchanged.
  if (refusalReason) {
    refused.push({ file, reason: refusalReason });
    continue;
  }

  if (next === raw) continue;

  rewritten.push(file);
  if (!DRY) fs.writeFileSync(file, next);
}

console.log(`Scanned ${files.length} content file(s) in ${CONTENT}/.`);

if (refused.length) {
  console.log(`\nRefused ${refused.length} file(s) (kept original, safer than corrupting):`);
  for (const { file, reason } of refused) console.log(`  ${file}  — ${reason}`);
}

if (!rewritten.length) {
  console.log(refused.length ? "" : "\nNo malformed Word-paste blocks found.");
  process.exit(0);
}

console.log(`\n${DRY ? "Would rewrite" : "Rewrote"} ${rewritten.length} file(s):`);
for (const file of rewritten) console.log(`  ${file}`);

if (DRY) console.log("\nRun without --dry-run to apply.");
