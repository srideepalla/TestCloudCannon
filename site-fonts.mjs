/**
 * Site font registration — single place to change families, weights, or provider.
 *
 * - Used by `astro.config.mjs` (`fonts`) and layout `<SiteFonts />` (preload / Font component).
 * - `cssVariable` values must match tokens consumed in CSS (`--font-body`, `--font-headings`).
 *
 * Heading typography uses Oswald, an open-source condensed sans-serif available from Google Fonts.
 *
 * @see https://docs.astro.build/en/guides/fonts/
 */
import { fontProviders } from "astro/config";

export const siteFonts = [
  {
    name: "Inter",
    cssVariable: "--font-body",
    provider: fontProviders.google(),
    weights: ["100 900"],
    styles: ["normal"],
    subsets: ["latin"],
  },
  {
    name: "Oswald",
    cssVariable: "--font-headings",
    provider: fontProviders.google(),
    weights: ["200 700"],
    styles: ["normal"],
    subsets: ["latin"],
  },
];
