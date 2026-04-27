/**
 * Site font registration — single place to change families, weights, or provider.
 *
 * - Used by `astro.config.mjs` (`fonts`) and layout `<SiteFonts />` (preload / Font component).
 * - `cssVariable` values must match tokens consumed in CSS (`--font-body`, `--font-headings`).
 *
 * Tusker Grotesk is a self-hosted font (TuskerGrotesk-6500Medium.woff2) located in src/assets/fonts/.
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
    name: "Tusker Grotesk",
    cssVariable: "--font-headings",
    provider: fontProviders.local(),
    options: {
      variants: [
        {
          weight: 500,
          style: "normal",
          src: ["./src/assets/fonts/TuskerGrotesk5500Medium.woff2"],
        },
        {
          weight: 600,
          style: "normal",
          src: ["./src/assets/fonts/TuskerGrotesk5600Semibold.woff2"],
        },
        {
          weight: 700,
          style: "normal",
          src: ["./src/assets/fonts/TuskerGrotesk6500Medium.woff2"],
        },
      ],
    },
  },
];
