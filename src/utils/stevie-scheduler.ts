/**
 * Stevie notification scheduler — shared config for the StevieScheduler component.
 *
 * The scheduling API is hosted on AWS (API Gateway + Lambda). Override the base
 * URL with PUBLIC_STEVIE_API (set it in CloudCannon's environment variables);
 * otherwise the hardcoded default below is used — same pattern as EnquiryForm's
 * Zendesk endpoints.
 *
 * NOTE: this API is currently open (no auth). Do not expose the scheduler on a
 * public page until an API key / admin gate is added — anyone could otherwise
 * broadcast to real subscribers.
 */
export const STEVIE_API =
  import.meta.env.PUBLIC_STEVIE_API ||
  "https://v50do6lpm3.execute-api.us-east-1.amazonaws.com";

/**
 * Fallback program list, used only if GET /config can't be reached. The live
 * list comes from the API (/config) so it stays in sync with the backend.
 */
export const FALLBACK_PROGRAMS: { code: string; label: string }[] = [
  { code: "ABA", label: "American Business Awards" },
  { code: "APSA", label: "Asia-Pacific Stevie Awards" },
  { code: "GSA", label: "German Stevie Awards" },
  { code: "IBA", label: "International Business Awards" },
  { code: "MENA", label: "Middle East & North Africa Stevie Awards" },
  { code: "SALES", label: "Sales & Customer Service" },
  { code: "WOMEN", label: "Women in Business" },
  { code: "EMPLOYERS", label: "Great Employers" },
  { code: "SATE", label: "Technology Excellence" },
  { code: "WFC", label: "Women | Future of Work" },
  { code: "IPRA", label: "Innovation & PR" },
  { code: "MENA-AR", label: "MENA (Arabic)" },
];
