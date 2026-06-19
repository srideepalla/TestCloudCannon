# The International Business Awards

The official website for The International Business Awards® (IBA), also known as the "International Stevies" - the world's premier business awards program recognizing achievements in the workplace across the globe.

Built with [Astro](https://astro.build/) and [CloudCannon](https://cloudcannon.com/) CMS for visual editing, this site features a component library architecture that allows content editors to build and manage pages through an intuitive visual interface.

## About The International Business Awards

For more than 20 years, The International Business Awards have shone a spotlight on organizations of every type and size worldwide: large and small, public and private, for-profit and non-profit. The competition attracts nominations from organizations in over 70 nations and markets, featuring categories spanning Management, Marketing, Public Relations, Product Development, Technology, AI Innovation, and more.

## Quick Start

```bash
npm install
npm run dev
```

Your site is now running at `http://localhost:4321`.

## Key Content Areas

The site is organized into several main content collections:

- **pages** - Main marketing and informational pages
- **about** - About the awards, FAQ, calendar
- **awards** - Categories, winners, and award information
- **enter** - Entry guidelines, tips, and submission information
- **judges** - Judging process and committee information
- **press** - Press releases, clippings, and media resources
- **sponsors** - Sponsorship opportunities and information
- **tickets** - Awards ceremony and event information

## Component Architecture

This site uses a component library approach with 40+ reusable Astro components. Each component follows a three-file pattern for seamless CloudCannon integration:

```
src/components/.../component-name/
├── ComponentName.astro                          # The component
├── component-name.cloudcannon.inputs.yml        # CloudCannon editor configuration
└── component-name.cloudcannon.structure-value.yml # Default values and picker metadata
```

### MDX Snippets

Some components are also available as **snippets** for use within MDX content. These allow editors to embed rich components directly in markdown content (such as images, videos, forms, and embeds). Snippet configurations are defined in `component-name.cloudcannon.snippets.yml` files and are automatically discovered by CloudCannon via the `_snippets_from_glob` setting in `cloudcannon.config.yml`.

### Key Directories

```
src/
├── components/          # All reusable components
│   ├── building-blocks/ # Core UI: buttons, headings, forms, layout wrappers
│   ├── page-sections/   # Full-width sections: heroes, features, CTAs, calendars
│   └── navigation/      # Header, footer, mobile nav
├── content/             # All site content (Markdown/MDX)
├── data/                # Site-wide data: navigation, footer, SEO, calendar
├── styles/              # Design tokens, themes, base styles
│   ├── variables/       # Colors, fonts, spacing, widths
│   └── themes/          # Light and dark theme definitions
└── component-docs/      # Component library documentation (excluded from production)
```

## Development Commands

| Command                      | Description                                       |
| ---------------------------- | ------------------------------------------------- |
| `npm run dev`                | Start the development server                      |
| `npm run build`              | Build for production (component docs excluded)    |
| `npm run build:with-library` | Build for production with component docs included |
| `npm run preview`            | Preview production build locally                  |
| `npm run check`              | Run linting and formatting checks                 |
| `npm run check:fix`          | Auto-fix linting and formatting issues            |

## Visual Editing in CloudCannon

This site is configured for visual editing in CloudCannon CMS. Content editors can:

- Build pages by selecting and configuring components through a visual interface
- Edit content directly on the page with live preview
- Manage site-wide data like navigation, footer, and SEO settings
- Add and organize content across multiple collections

The CloudCannon configuration is defined in `cloudcannon.config.yml` or component yml files.

## Site Data Management

Site-wide configuration is managed through JSON files in `src/data/`:

- `mainNav.json` - Main navigation structure
- `sidebarNav.json` - Sidebar navigation for content pages
- `footer.json` - Footer content and links
- `seo.json` - SEO metadata and social media configuration
- `calendar.json` - Event dates and deadlines
- `quickActions.json` - Quick action menu (floating action button)

## Prerequisites

- Node.js >= 24.0.0

## Component Documentation

During development, visit [localhost:4321/component-docs/](http://localhost:4321/component-docs/) to explore the component library with examples, documentation, and a visual component builder.

## Real Zendesk assignee cutover

The `/enquiry` form routes each submission to Zendesk by embedding a per-subcategory
routing code (`SAE01`–`SAE43`) in the ticket subject. Live Zendesk triggers match that
code and **tag** the ticket (`stevie_enquiry`, category, subcategory, and an
`assignee_<owner>` tag such as `assignee_roman`). Today routing is **tag-only** — no real
assignee — because the named owners do not yet exist as Zendesk agents.

When those owners are onboarded as Zendesk agents, flip the triggers from tag-only to
"group Support + real assignee" with a single controlled script run — no manual trigger
editing:

1. **Fill in emails.** Edit `scripts/zendesk-owners.js` and set each owner's real Zendesk
   agent email. Do not invent emails — only add an owner's email once they actually exist
   as an agent/admin.
2. **Set credentials** (the API token's owning agent/admin email + token):

   ```bash
   export ZENDESK_EMAIL="you@example.com"
   export ZENDESK_API_TOKEN="…"
   # optional: export ZENDESK_SUBDOMAIN="thestevieawardshelp"
   ```

3. **Dry-run** (default — reads Zendesk, prints a plan, changes nothing):

   ```bash
   node scripts/zendesk-assignee-cutover.js
   ```

4. **Apply** once the dry-run looks right:

   ```bash
   node scripts/zendesk-assignee-cutover.js --apply
   ```

Safety guarantees:

- **Dry-run by default**; writes happen only with `--apply`.
- **All-or-nothing validation** — every owner must resolve to a Zendesk agent/admin before
  any trigger is touched. One missing/invalid owner aborts the whole run with no changes.
- **Tags are preserved** — the script keeps the existing tag writes (so
  `assignee_roman`/category/subcategory tags keep flowing for reporting) and simply *adds*
  a real `assignee_id`.
- **Future tickets only** — updating triggers affects new submissions only. There is no
  historical bulk-assignment of existing tickets (intentionally out of scope).
- `SAE41` (Women / Speaker Application → `AUTOMATION`) is **skipped** — that owner is not a
  real person and its wiring is deferred.

## License

MIT
