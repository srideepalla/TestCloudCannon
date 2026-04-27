/**
 * Whether to include draft content in the build.
 *
 * - Always true in local dev (`astro dev`)
 * - True in staging builds when the SHOW_DRAFTS env var is set to "true"
 * - False in production builds (default)
 *
 * In CloudCannon, set SHOW_DRAFTS=true as an environment variable on your
 * staging branch to preview draft pages before publishing.
 */
export const showDrafts = import.meta.env.DEV || import.meta.env.SHOW_DRAFTS === "true";

/**
 * Filter function for use with getCollection() to exclude draft entries
 * in production builds.
 *
 * @example
 * const entries = await getCollection("about", draftFilter);
 */
export const draftFilter = ({ data }: { data: { draft?: boolean } }) => showDrafts || !data.draft;
