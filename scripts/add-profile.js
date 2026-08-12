#!/usr/bin/env node

/**
 * Add a person/organization profile JSON file to src/content/profiles/ from
 * anywhere on disk. Astro's profiles collection (src/content.config.ts) picks
 * up any .json file dropped in that folder automatically — this script just
 * copies the file into place with a safe, slugified filename.
 *
 * Usage: npm run add -- <path-to-json> [--as <slug>] [--force]
 * Example: npm run add -- C:\Users\you\Desktop\global-touch.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROFILES_DIR = path.join(__dirname, "../src/content/profiles");

function usageAndExit(message) {
  if (message) console.error(`Error: ${message}\n`);
  console.error("Usage: npm run add -- <path-to-json> [--as <slug>] [--force]");
  console.error("Example: npm run add -- C:\\Users\\you\\Desktop\\global-touch.json");
  process.exit(1);
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const args = process.argv.slice(2);
const positional = [];
let asSlug = null;
let force = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--force" || arg === "-f") {
    force = true;
  } else if (arg === "--as") {
    asSlug = args[++i];
  } else {
    positional.push(arg);
  }
}

const sourcePath = positional[0];
if (!sourcePath) usageAndExit("missing <path-to-json> argument.");

const resolvedSource = path.resolve(sourcePath);
if (!fs.existsSync(resolvedSource)) usageAndExit(`file not found: ${resolvedSource}`);
if (path.extname(resolvedSource).toLowerCase() !== ".json") {
  usageAndExit("source file must be a .json file.");
}

let raw;
let data;
try {
  raw = fs.readFileSync(resolvedSource, "utf8");
  data = JSON.parse(raw);
} catch (error) {
  usageAndExit(`could not parse JSON: ${error.message}`);
}

if (data.type !== "person" && data.type !== "organization") {
  usageAndExit('the JSON must have "type": "person" or "type": "organization".');
}

if (!data.name || typeof data.name !== "string") {
  usageAndExit('the JSON must have a "name" (string).');
}

const slug = slugify(asSlug || data.name || path.basename(resolvedSource, ".json"));
if (!slug) usageAndExit("could not derive a filename slug — pass one explicitly with --as.");

fs.mkdirSync(PROFILES_DIR, { recursive: true });
const destPath = path.join(PROFILES_DIR, `${slug}.json`);

if (fs.existsSync(destPath) && !force) {
  usageAndExit(`${path.relative(process.cwd(), destPath)} already exists. Use --force to overwrite.`);
}

fs.writeFileSync(destPath, raw.endsWith("\n") ? raw : `${raw}\n`);

console.log(`Added profile: ${path.relative(process.cwd(), destPath)}`);
console.log(`It will be available at /profiles/${slug}`);
