/**
 * Enquiry form config + routing — single source of truth for the support/enquiry form.
 *
 * This is a static Astro/CloudCannon site, so the enquiry form submits *client-side*
 * straight to the Zendesk Requests API (anonymous request creation, no API token).
 * See ZENDESK_REQUEST_ENDPOINT below and EnquiryForm.astro for the submit logic.
 *
 * Routing is driven by the CATEGORY / SUBCATEGORY the requester picks. Each subcategory
 * carries a unique routing CODE (SAE01, SAE02, …) that is embedded in the ticket subject:
 *   "[<Category> / <Subcategory>] Stevie enquiry: <program> - <company/name> [<CODE>]"
 * Since we create requests anonymously from the browser, end users cannot set tags or
 * assignees — so a Zendesk trigger keyed on each unique code does the routing instead.
 *
 * The named assignee on each subcategory is the intended owner. Those agents do not all
 * exist in Zendesk yet, so the triggers currently route to the Support group and add an
 * `assignee_<name>` tag ("tag now, assign later"); set the real assignee_id on each
 * trigger once the agents are created.
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

/**
 * A subcategory — the routing leaf. `code` is the unique token embedded in the subject
 * that a Zendesk trigger matches on; `assignee` is the intended owner (routed via an
 * `assignee_<name>` tag until that agent exists in Zendesk).
 */
export interface Subcategory {
  value: string;
  label: string;
  code: string;
  assignee: string;
}

/** A top-level category grouping subcategories. `tag` is added to routed tickets. */
export interface Category {
  value: string;
  label: string;
  tag: string;
  subcategories: Subcategory[];
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
 * The program THIS site is for. Each deployed site/branch is a single program (e.g. this is
 * the Women site → "women"). The enquiry form pre-selects this program and locks the field so
 * visitors don't have to (and can't) pick it again.
 *
 * Must match a PROGRAMS `value`. Override per-site without a code change via the
 * PUBLIC_SITE_PROGRAM env var. Set to "" (empty) on a multi-program site to show the full
 * program dropdown instead.
 */
export const SITE_PROGRAM = "women";

/**
 * Categories + subcategories — the routing tree. The requester picks a category, then a
 * subcategory; the subcategory's `code` is embedded in the subject and a Zendesk trigger
 * routes on it. Codes are stable identifiers — do NOT renumber existing ones (the triggers
 * match them); only append new codes when adding subcategories.
 */
export const CATEGORIES: Category[] = [
  {
    value: "account-issues",
    label: "Account Issues",
    tag: "account_issues",
    subcategories: [
      { value: "account-access-issue", label: "Account Access Issue", code: "SAE01", assignee: "Roman" },
      { value: "account-deletion", label: "Account Deletion", code: "SAE02", assignee: "Roman" },
      { value: "account-updates", label: "Account Updates", code: "SAE03", assignee: "Roman" },
      { value: "account-other", label: "Other", code: "SAE04", assignee: "Roman" },
    ],
  },
  {
    value: "award-ceremonies",
    label: "Award Ceremonies",
    tag: "award_ceremonies",
    subcategories: [
      { value: "ceremony-sponsorship", label: "Ceremony Sponsorship", code: "SAE05", assignee: "Lindsey" },
      { value: "ticket-purchase-question", label: "Ticket Purchase Question", code: "SAE06", assignee: "Lindsey" },
      { value: "ticket-purchase-technical-issue", label: "Ticket Purchase Technical Issue", code: "SAE07", assignee: "Roman" },
      { value: "ceremonies-other", label: "Other", code: "SAE08", assignee: "Lindsey" },
    ],
  },
  {
    value: "award-shipments",
    label: "Award Shipments",
    tag: "award_shipments",
    subcategories: [
      { value: "shipping-fees-payment", label: "Question About Payment of Shipping Fees", code: "SAE09", assignee: "Hal" },
      { value: "shipment-status", label: "Status of My Award(s) Shipment", code: "SAE10", assignee: "Katina" },
      { value: "shipments-other", label: "Other", code: "SAE11", assignee: "Katina" },
    ],
  },
  {
    value: "international",
    label: "International",
    tag: "international",
    subcategories: [
      { value: "americas", label: "Americas", code: "SAE12", assignee: "Michael" },
      { value: "asia-oceania", label: "Asia and Oceania", code: "SAE13", assignee: "Michael" },
      { value: "europe-africa", label: "Europe and Africa", code: "SAE14", assignee: "Marc" },
      { value: "mena", label: "Middle East & North Africa", code: "SAE15", assignee: "May" },
    ],
  },
  {
    value: "judging",
    label: "Judging",
    tag: "judging",
    subcategories: [
      { value: "judging-application", label: "Judging Application", code: "SAE16", assignee: "Elizabeth" },
      { value: "judging-technical-issue", label: "Judging Technical Issue", code: "SAE17", assignee: "Elizabeth" },
      { value: "judging-other", label: "Other", code: "SAE18", assignee: "Elizabeth" },
    ],
  },
  {
    value: "marketing",
    label: "Marketing",
    tag: "marketing",
    subcategories: [
      { value: "media", label: "Media", code: "SAE19", assignee: "Nina" },
      { value: "press-inquiries", label: "Press Inquiries", code: "SAE20", assignee: "Nina" },
      { value: "vendor-inquiry", label: "Vendor Inquiry", code: "SAE21", assignee: "Nina" },
      { value: "marketing-other", label: "Other", code: "SAE22", assignee: "Nina" },
    ],
  },
  {
    value: "nomination-process",
    label: "Nomination Process",
    tag: "nomination_process",
    subcategories: [
      { value: "category-selection", label: "Category Selection", code: "SAE23", assignee: "Michael" },
      { value: "entry-deadline-question", label: "Entry Deadline Question", code: "SAE24", assignee: "Hal" },
      { value: "entry-fee-waiver-request", label: "Entry Fee Waiver Request", code: "SAE25", assignee: "Hal" },
      { value: "submission-technical-issue", label: "Submission Technical Issue", code: "SAE26", assignee: "Roman" },
      { value: "nomination-other", label: "Other", code: "SAE27", assignee: "Hal" },
    ],
  },
  {
    value: "payments",
    label: "Payments",
    tag: "payments",
    subcategories: [
      { value: "invoice-question", label: "Question About/Issue With My Invoice", code: "SAE28", assignee: "Esther" },
      { value: "payments-other", label: "Other", code: "SAE29", assignee: "Esther" },
    ],
  },
  {
    value: "peoples-choice",
    label: "People’s Choice / Public Voting",
    tag: "peoples_choice",
    subcategories: [
      { value: "activate-voters", label: "How to Activate Voters", code: "SAE30", assignee: "Michael" },
      { value: "peoples-choice-technical-issue", label: "Technical Issue", code: "SAE31", assignee: "Roman" },
      { value: "peoples-choice-other", label: "Other", code: "SAE32", assignee: "Michael" },
    ],
  },
  {
    value: "sponsorship-partnership",
    label: "Sponsorship and Partnership",
    tag: "sponsorship_partnership",
    subcategories: [
      { value: "award-ceremony-sponsorship", label: "Award Ceremony Sponsorship", code: "SAE33", assignee: "Lindsey" },
      { value: "program-sponsorship", label: "Program Sponsorship", code: "SAE34", assignee: "Michael" },
      { value: "sponsorship-other", label: "Other", code: "SAE35", assignee: "Michael" },
    ],
  },
  {
    value: "store",
    label: "Stevie Awards Store",
    tag: "store",
    subcategories: [
      { value: "order-question", label: "Question About My Order", code: "SAE36", assignee: "Katina" },
      { value: "store-other", label: "Other", code: "SAE37", assignee: "Katina" },
    ],
  },
  {
    value: "website",
    label: "Website",
    tag: "website",
    subcategories: [
      { value: "erroneous-missing-content", label: "Erroneous or Missing Content", code: "SAE38", assignee: "Maggie" },
      { value: "website-technical-issue", label: "Technical Issue", code: "SAE39", assignee: "Roman" },
      { value: "website-other", label: "Other", code: "SAE40", assignee: "Roman" },
    ],
  },
  {
    value: "women-future-webinars",
    label: "Women / Future Webinars",
    tag: "women_future_webinars",
    subcategories: [
      { value: "speaker-application", label: "Speaker Application", code: "SAE41", assignee: "AUTOMATION" },
      { value: "women-future-other", label: "Other", code: "SAE42", assignee: "Lindsey" },
    ],
  },
  {
    value: "other",
    label: "Other",
    tag: "other",
    subcategories: [
      { value: "general-other", label: "Other", code: "SAE43", assignee: "Roman" },
    ],
  },
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
