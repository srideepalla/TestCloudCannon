/**
 * Source-of-truth owner map for the Zendesk enquiry-routing assignee cutover.
 *
 * Keys are the owner slug used in the routing tags the triggers already write
 * (`assignee_<slug>`, e.g. `assignee_roman`). Each owner maps to a display name and the
 * Zendesk agent email to assign tickets to.
 *
 * IMPORTANT:
 * - Emails are intentionally BLANK. Fill in each owner's real Zendesk agent email ONLY
 *   when that person actually exists as an agent/admin in Zendesk. Do NOT invent emails.
 * - The cutover script (zendesk-assignee-cutover.js) refuses to apply anything until
 *   EVERY owner below has a non-empty email that resolves to a Zendesk agent/admin.
 * - `AUTOMATION` (the Women / Speaker Application owner, SAE41) is deliberately NOT here:
 *   it is not a real person and its wiring is deferred. The cutover script skips any
 *   trigger whose owner slug is not in this map.
 *
 * See README.md → "Real Zendesk assignee cutover".
 */

/** Zendesk group all enquiry tickets are routed to (the default "Support" group). */
export const SUPPORT_GROUP_ID = "52584561456915";

/** Default Zendesk subdomain (override with ZENDESK_SUBDOMAIN). */
export const DEFAULT_SUBDOMAIN = "thestevieawardshelp";

/**
 * owner slug -> { name, email }. The 11 real people the routing triggers target.
 * Fill `email` per owner as they are onboarded as Zendesk agents.
 */
export const OWNERS = {
  roman: { name: "Roman", email: "" },
  lindsey: { name: "Lindsey", email: "" },
  hal: { name: "Hal", email: "" },
  katina: { name: "Katina", email: "" },
  michael: { name: "Michael", email: "" },
  marc: { name: "Marc", email: "" },
  may: { name: "May", email: "" },
  elizabeth: { name: "Elizabeth", email: "" },
  nina: { name: "Nina", email: "" },
  esther: { name: "Esther", email: "" },
  maggie: { name: "Maggie", email: "" },
};
