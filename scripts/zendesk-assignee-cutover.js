/**
 * Zendesk enquiry-routing assignee cutover.
 *
 * Today the SAE routing triggers route every enquiry to the Support group and write
 * tags only (`assignee_roman`, `assignee_michael`, …) — no real assignee, because the
 * named owners do not yet exist as Zendesk agents. This script flips the triggers from
 * tag-only to "group Support + real assignee" once those agents exist, WITHOUT touching
 * the existing tag writes (so reporting tags keep flowing).
 *
 * Safety model:
 *   - DRY-RUN BY DEFAULT. Reads Zendesk and prints a plan; changes nothing.
 *   - Only `--apply` performs writes.
 *   - ALL-OR-NOTHING: every owner in scripts/zendesk-owners.js must have an email that
 *     resolves to a Zendesk agent/admin BEFORE any write happens. If even one owner is
 *     missing/invalid, the script fails during validation and applies nothing.
 *   - The Women / Speaker Application owner (AUTOMATION, SAE41) is intentionally skipped
 *     (not a real person; deferred).
 *   - Future tickets only — this does NOT touch existing tickets. Once triggers carry a
 *     real assignee, new submissions are assigned automatically. (No historical bulk
 *     assignment is provided, by design.)
 *
 * Usage:
 *   ZENDESK_EMAIL=you@example.com ZENDESK_API_TOKEN=xxxx node scripts/zendesk-assignee-cutover.js
 *   ... add --apply to actually update the triggers.
 *
 * Env:
 *   ZENDESK_EMAIL      (required) agent/admin email that owns the API token
 *   ZENDESK_API_TOKEN  (required) Zendesk API token
 *   ZENDESK_SUBDOMAIN  (optional) defaults to thestevieawardshelp
 */

import { OWNERS, SUPPORT_GROUP_ID, DEFAULT_SUBDOMAIN } from "./zendesk-owners.js";

const APPLY = process.argv.includes("--apply");
const SUBDOMAIN = process.env.ZENDESK_SUBDOMAIN || DEFAULT_SUBDOMAIN;
const EMAIL = process.env.ZENDESK_EMAIL;
const TOKEN = process.env.ZENDESK_API_TOKEN;
const BASE = `https://${SUBDOMAIN}.zendesk.com/api/v2`;

function die(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

if (!EMAIL || !TOKEN) {
  die("Set ZENDESK_EMAIL and ZENDESK_API_TOKEN in the environment.");
}

const AUTH = "Basic " + Buffer.from(`${EMAIL}/token:${TOKEN}`).toString("base64");

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: AUTH, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return json;
}

/** Find a Zendesk user by exact email. Returns the user object or null. */
async function findUserByEmail(email) {
  const q = encodeURIComponent(`type:user email:${email}`);
  const { users = [] } = await api("GET", `/users/search.json?query=${q}`);
  return users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase()) || null;
}

/** Is the user a member of the Support group? */
async function isInSupportGroup(userId) {
  const { group_memberships = [] } = await api(
    "GET",
    `/users/${userId}/group_memberships.json`
  );
  return group_memberships.some((m) => String(m.group_id) === String(SUPPORT_GROUP_ID));
}

/** Fetch the SAE enquiry-routing triggers (active + inactive). */
async function fetchRoutingTriggers() {
  const { triggers = [] } = await api("GET", "/triggers.json?per_page=100");
  return triggers.filter(
    (t) => t.title.startsWith("Route enquiry:") && /\[SAE\d+\]/.test(t.title)
  );
}

/** Pull the `assignee_<slug>` owner slug out of a trigger's current_tags action. */
function ownerSlugFromTrigger(trigger) {
  const tagsAction = (trigger.actions || []).find((a) => a.field === "current_tags");
  if (!tagsAction) return null;
  const tag = String(tagsAction.value || "")
    .split(/\s+/)
    .find((t) => t.startsWith("assignee_"));
  return tag ? tag.slice("assignee_".length) : null;
}

/** Build the trigger's new actions: keep everything, ensure one assignee_id action. */
function withAssignee(actions, userId) {
  const kept = (actions || []).filter((a) => a.field !== "assignee_id");
  // Guarantee the Support group action is present (it already is on every SAE trigger).
  if (!kept.some((a) => a.field === "group_id")) {
    kept.push({ field: "group_id", value: SUPPORT_GROUP_ID });
  }
  kept.push({ field: "assignee_id", value: String(userId) });
  return kept;
}

async function main() {
  console.log(`\n🔁 Zendesk assignee cutover — ${APPLY ? "APPLY" : "DRY-RUN"} mode`);
  console.log(`   subdomain: ${SUBDOMAIN}\n`);

  // ── Phase 1: validate + resolve every owner (read-only) ──────────────────────────
  const errors = [];
  const resolved = {}; // slug -> { name, email, userId, role, inGroup }

  for (const [slug, owner] of Object.entries(OWNERS)) {
    if (!owner.email || !owner.email.trim()) {
      errors.push(`Owner "${slug}" (${owner.name}) has no email in scripts/zendesk-owners.js`);
      continue;
    }
    let user;
    try {
      user = await findUserByEmail(owner.email.trim());
    } catch (e) {
      errors.push(`Lookup failed for ${owner.email}: ${e.message}`);
      continue;
    }
    if (!user) {
      errors.push(`No Zendesk user found for "${slug}" <${owner.email}>`);
      continue;
    }
    if (user.role !== "agent" && user.role !== "admin") {
      errors.push(
        `"${slug}" <${owner.email}> is role="${user.role}", not agent/admin — cannot be assigned tickets`
      );
      continue;
    }
    const inGroup = await isInSupportGroup(user.id);
    resolved[slug] = { ...owner, userId: user.id, role: user.role, inGroup };
  }

  // Map triggers to owners; figure out which are actionable vs skipped (AUTOMATION/etc).
  const triggers = await fetchRoutingTriggers();
  const plan = []; // { trigger, slug, status }
  const skipped = [];
  for (const t of triggers) {
    const slug = ownerSlugFromTrigger(t);
    const code = (t.title.match(/\[SAE\d+\]/) || ["?"])[0];
    if (!slug) {
      skipped.push({ code, title: t.title, reason: "no assignee_ tag found" });
      continue;
    }
    if (!(slug in OWNERS)) {
      // e.g. assignee_automation (SAE41) — intentionally deferred.
      skipped.push({ code, title: t.title, reason: `owner "${slug}" not in OWNERS (deferred)` });
      continue;
    }
    const alreadySet = (t.actions || []).some((a) => a.field === "assignee_id");
    plan.push({ trigger: t, slug, code, alreadySet });
  }

  // ── Gate: any owner error → fail BEFORE applying anything ────────────────────────
  if (errors.length) {
    console.error("Validation failed — no changes made:\n");
    for (const e of errors) console.error(`   • ${e}`);
    die(
      `${errors.length} owner(s) not ready. Fill scripts/zendesk-owners.js with valid ` +
        `agent emails and re-run. (All owners must resolve before any trigger is updated.)`
    );
  }

  // ── Phase 2: print the plan ──────────────────────────────────────────────────────
  console.log("Resolved owners:");
  for (const [slug, r] of Object.entries(resolved)) {
    console.log(
      `   ✓ ${slug.padEnd(10)} ${r.email.padEnd(34)} id=${r.userId} role=${r.role}` +
        (r.inGroup ? "  [in Support]" : "  [will add to Support]")
    );
  }
  console.log(`\nTriggers to update (${plan.length}):`);
  for (const p of plan) {
    const r = resolved[p.slug];
    console.log(
      `   ${p.code.padEnd(8)} → ${p.slug.padEnd(10)} (id=${r.userId})` +
        (p.alreadySet ? "  [assignee already set — will refresh]" : "")
    );
  }
  if (skipped.length) {
    console.log(`\nSkipped (${skipped.length}):`);
    for (const s of skipped) console.log(`   ${s.code.padEnd(8)} — ${s.reason}`);
  }

  if (!APPLY) {
    console.log(
      `\n💡 Dry-run only. Re-run with --apply to add Support-group memberships and set ` +
        `real assignees on the ${plan.length} trigger(s). Tags are preserved.`
    );
    return;
  }

  // ── Phase 3: apply ───────────────────────────────────────────────────────────────
  console.log("\n⚙️  Applying…");

  // 3a. Add missing Support-group memberships.
  for (const [slug, r] of Object.entries(resolved)) {
    if (r.inGroup) continue;
    await api("POST", "/group_memberships.json", {
      group_membership: { user_id: r.userId, group_id: SUPPORT_GROUP_ID },
    });
    console.log(`   + added ${slug} (${r.email}) to Support group`);
  }

  // 3b. Update triggers: keep group + tags, set real assignee.
  for (const p of plan) {
    const r = resolved[p.slug];
    const actions = withAssignee(p.trigger.actions, r.userId);
    await api("PUT", `/triggers/${p.trigger.id}.json`, { trigger: { actions } });
    console.log(`   ✓ ${p.code} now assigns → ${p.slug} (id=${r.userId})`);
  }

  console.log(`\n✅ Done. ${plan.length} trigger(s) updated; tag writes preserved.`);
}

main().catch((e) => die(e.message));
