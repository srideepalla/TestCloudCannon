import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const contentBlockSchema = z.object({ _component: z.string() }).passthrough();

const pageSchema = z.object({
  title: z.string(),
  pageHeading: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  keywords: z.array(z.string()).optional(),
  image: z.string().nullable().optional(),
  canonical: z.string().optional(),
  draft: z.boolean().default(false),
  pageSections: z.array(contentBlockSchema).optional(),
  sidebarCollection: z.string().optional(),
  sidebarBlocks: z.array(contentBlockSchema).optional(),
});

const docsPageSchema = z.object({
  title: z.string(),
  contentSections: z.array(contentBlockSchema),
});

const docsComponentSchema = z.object({
  title: z.string().optional(),
  name: z.string().optional(),
  order: z.number().optional(),
  overview: z.string().optional(),
  spacing: z.string().optional().nullable(),
  component: z.string().optional(),
  component_path: z.string().optional(),
  blocks: z
    .union([z.record(z.string(), z.any()), z.array(z.record(z.string(), z.any()))])
    .optional(),
  slots: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        fallback_for: z.string().optional().nullable(),
        child_component: z
          .object({
            name: z.string(),
            props: z.array(z.string()).optional(),
          })
          .optional()
          .nullable(),
      })
    )
    .optional(),
  examples: z
    .union([
      z.array(
        z.object({
          title: z.string().optional(),
          slugs: z.array(z.string()),
        })
      ),
      z.null(),
    ])
    .optional()
    .transform((val) => {
      if (!val) return [];

      return val.map((example) => ({
        title:
          example.title ||
          (example.slugs?.[0]
            ? example.slugs[0].replace(/-/g, " ").charAt(0).toUpperCase() +
              example.slugs[0].replace(/-/g, " ").slice(1)
            : "Example"),
        slugs: example.slugs,
        size: example.size ?? "md",
      }));
    }),
});

const pagesCollection = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/pages" }),
  schema: pageSchema,
});

const docsPagesCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/component-docs/content/pages" }),
  schema: docsPageSchema,
});

const docsComponentsCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/component-docs/content/components" }),
  schema: docsComponentSchema,
});

const collectionPageSchema = z
  .object({
    title: z.string().nullable().default(""),
    pageHeading: z.string().nullable().optional(),
    date: z.coerce.date().nullable().optional(),
    author: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    tags: z.array(z.string()).default([]),
    categories: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    sourceUrl: z.string().optional(),
    pageSections: z.array(contentBlockSchema).optional(),
  })
  .passthrough();

const makeCollection = (base: string) =>
  defineCollection({
    loader: glob({ pattern: "**/*.{md,mdx}", base }),
    schema: collectionPageSchema,
  });

const aboutCollection = makeCollection("./src/content/about");
const awardsCollection = makeCollection("./src/content/awards");
const enterCollection = makeCollection("./src/content/enter");
const judgesCollection = makeCollection("./src/content/judges");
const pressCollection = makeCollection("./src/content/press");
const sponsorsCollection = makeCollection("./src/content/sponsors");
const tagsCollection = makeCollection("./src/content/tags");
const ticketsCollection = makeCollection("./src/content/tickets");

// Profiles: one JSON file per person or organization. Adding a new profile is
// just dropping a new .json file here — src/pages/profiles/[...slug].astro and
// src/layouts/ProfileLayout.astro render every entry through the same template,
// so no per-entity page or code change is needed.
//
// The schema supports both a simple flat profile (name/tagline/bio/details) and
// a richer nomination-style writeup (headline/eyebrow/badge/summary/sections) —
// entries use whichever fields fit what they're describing.
const profileStatItemSchema = z.object({
  label: z.string(),
  value: z.string(),
  note: z.string().optional(),
});

const profileQaItemSchema = z.object({
  number: z.number().optional(),
  prompt: z.string().optional(),
  note: z.string().optional(),
  paragraphs: z.array(z.string()).default([]),
  bullets: z.array(z.string()).default([]),
});

const profileLinkItemSchema = z.object({
  title: z.string(),
  url: z.string().optional(),
  note: z.string().optional(),
});

const profileQuoteItemSchema = z.object({
  quote: z.string(),
  attribution: z.string().optional(),
  source: z.string().optional(),
});

const profileTimelineItemSchema = z.object({
  date: z.string(),
  title: z.string(),
  body: z.string().optional(),
});

const profileDetailItemSchema = z.object({
  label: z.string(),
  value: z.string(),
  note: z.string().optional(),
});

const profileSectionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("stats"),
    title: z.string().optional(),
    items: z.array(profileStatItemSchema).default([]),
  }),
  z.object({
    type: z.literal("qa"),
    title: z.string().optional(),
    items: z.array(profileQaItemSchema).default([]),
  }),
  z.object({
    type: z.literal("links"),
    title: z.string().optional(),
    items: z.array(profileLinkItemSchema).default([]),
  }),
  z.object({
    type: z.literal("quotes"),
    title: z.string().optional(),
    items: z.array(profileQuoteItemSchema).default([]),
  }),
  z.object({
    type: z.literal("prose"),
    title: z.string().optional(),
    paragraphs: z.array(z.string()).default([]),
    bullets: z.array(z.string()).default([]),
  }),
  z.object({
    type: z.literal("timeline"),
    title: z.string().optional(),
    items: z.array(profileTimelineItemSchema).default([]),
  }),
  z.object({
    type: z.literal("details"),
    title: z.string().optional(),
    items: z.array(profileDetailItemSchema).default([]),
  }),
]);

const profileSchema = z.object({
  type: z.enum(["person", "organization"]),
  name: z.string(),
  headline: z.string().nullable().optional(),
  eyebrow: z.string().nullable().optional(),
  tagline: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  affiliation: z.string().nullable().optional(),
  badge: z
    .object({
      primary: z.string().optional(),
      secondary: z.string().optional(),
      tertiary: z.string().optional(),
    })
    .optional(),
  photo: z
    .object({
      source: z.string(),
      alt: z.string().optional(),
    })
    .optional(),
  bio: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  socialLinks: z
    .array(
      z.object({
        platform: z.string(),
        url: z.string(),
      })
    )
    .default([]),
  details: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      })
    )
    .default([]),
  tags: z.array(z.string()).default([]),
  sections: z.array(profileSectionSchema).default([]),
  description: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  draft: z.boolean().default(false),
});

const profilesCollection = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/profiles" }),
  schema: profileSchema,
});

export const collections = {
  pages: pagesCollection,
  "docs-pages": docsPagesCollection,
  "docs-components": docsComponentsCollection,
  about: aboutCollection,
  awards: awardsCollection,
  enter: enterCollection,
  judges: judgesCollection,
  press: pressCollection,
  sponsors: sponsorsCollection,
  tags: tagsCollection,
  tickets: ticketsCollection,
  profiles: profilesCollection,
};
