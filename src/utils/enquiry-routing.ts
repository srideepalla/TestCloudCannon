/**
 * Enquiry form config + routing — single source of truth for the support/enquiry form.
 *
 * This is a static Astro/CloudCannon site, so the enquiry form submits *client-side*
 * straight to the Zendesk Requests API (anonymous request creation, no API token).
 * See ZENDESK_REQUEST_ENDPOINT below and EnquiryForm.astro for the submit logic.
 *
 * Routing is driven by the QUERY TYPE, which is encoded as an uppercase prefix in the
 * ticket subject: "[<QUERY_TYPE>] Stevie enquiry: <program> - <company/name>".
 * Since we create requests anonymously from the browser, we do NOT assign groups from
 * the frontend — Zendesk triggers route on the subject prefix instead.
 *
 * TODO: Final assignment should be handled in Zendesk triggers, matching the subject
 * prefix to a team / email:
 *     [NOMINATIONS] -> nominations team/email
 *     [JUDGING]     -> judging team/email
 *     [CEREMONIES]  -> ceremonies team/email
 *     [PAYMENTS]    -> payments team/email
 */

/**
 * A program/award the enquiry is about. `short` is the compact code (ABA, IBA, …)
 * used in the ticket subject; `label` is the friendly text shown in the dropdown.
 */
export interface ProgramOption {
  value: string;
  label: string;
  short: string;
}

/** A query type — the routing "switch" encoded as the subject prefix. */
export interface QueryType {
  value: string;
  label: string;
}

/**
 * Internal contact address shown as a fallback if the form ever can't submit
 * (e.g. misconfigured endpoint). Not a routing target — Zendesk handles routing.
 */
export const INTERNAL_TEST_INBOX = "avinash@flashbacklabs.com";

/** Fallback contact used in error messaging (fail-safe). */
export const FALLBACK_RECIPIENT = INTERNAL_TEST_INBOX;

/**
 * Zendesk Requests API endpoint (public, anonymous request creation). The form
 * POSTs JSON here directly from the browser — this is the supported anonymous flow
 * and requires NO API token (the requests.json endpoint never exposes credentials,
 * unlike the Tickets API). Override with PUBLIC_ZENDESK_REQUEST_ENDPOINT if needed.
 *
 * Note: Zendesk has "Verify anonymous requests" enabled, so a new submission may
 * land in Suspended tickets until the requester verifies their email.
 */
export const ZENDESK_REQUEST_ENDPOINT =
  "https://thestevieawardshelp.zendesk.com/api/v2/requests.json";

/**
 * Zendesk Uploads API endpoint. Each attachment is POSTed here as raw binary with
 * `?filename=<name>`; the response returns an upload token that we attach to the
 * request via comment.uploads. No API token required (public uploads, like requests).
 * Override with PUBLIC_ZENDESK_UPLOADS_ENDPOINT if needed.
 */
export const ZENDESK_UPLOADS_ENDPOINT =
  "https://thestevieawardshelp.zendesk.com/api/v2/uploads.json";

/**
 * Programs/awards the enquiry can concern (required field). `short` is used in the
 * ticket subject (ABA, IBA, …); `label` is shown in the dropdown. Edit freely.
 */
export const PROGRAMS: ProgramOption[] = [
  { value: "aba", short: "ABA", label: "The American Business Awards (ABA)" },
  { value: "iba", short: "IBA", label: "The International Business Awards (IBA)" },
  { value: "women", short: "Women", label: "Stevie Awards for Women in Business" },
  { value: "sales", short: "Sales & CS", label: "Stevie Awards for Sales & Customer Service" },
  { value: "employers", short: "Great Employers", label: "Stevie Awards for Great Employers" },
  { value: "apsa", short: "APSA", label: "Asia-Pacific Stevie Awards" },
  { value: "german", short: "German", label: "German Stevie Awards" },
  { value: "mena", short: "MENA", label: "Middle East & North Africa Stevie Awards" },
  { value: "technology", short: "Tech", label: "Stevie Awards for Technology Excellence" },
  { value: "other", short: "Other", label: "Other / not sure" },
];

/**
 * Query types — the routing "switch". The label, uppercased, becomes the subject
 * prefix (e.g. "Nominations" -> "[NOMINATIONS]") that Zendesk triggers route on.
 */
export const QUERY_TYPES: QueryType[] = [
  { value: "nominations", label: "Nominations" },
  { value: "judging", label: "Judging" },
  { value: "ceremonies", label: "Ceremonies" },
  { value: "payments", label: "Payments" },
];

/** Country / region options for the requester's location (drives the dropdown). */
export const COUNTRIES: string[] = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Netherlands",
  "Belgium",
  "Switzerland",
  "Austria",
  "Ireland",
  "Portugal",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Poland",
  "Czech Republic",
  "Hungary",
  "Romania",
  "Greece",
  "Turkey",
  "Russia",
  "Ukraine",
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Bahrain",
  "Oman",
  "Israel",
  "Egypt",
  "Jordan",
  "Lebanon",
  "Morocco",
  "Tunisia",
  "South Africa",
  "Nigeria",
  "Kenya",
  "Ghana",
  "India",
  "Pakistan",
  "Bangladesh",
  "Sri Lanka",
  "China",
  "Hong Kong",
  "Taiwan",
  "Japan",
  "South Korea",
  "Singapore",
  "Malaysia",
  "Indonesia",
  "Thailand",
  "Vietnam",
  "Philippines",
  "New Zealand",
  "Mexico",
  "Brazil",
  "Argentina",
  "Chile",
  "Colombia",
  "Peru",
  "Other",
];
