# profiles-api

A small Cloudflare Worker that turns profile and page creation into a
service. Pick a CloudCannon component, POST its JSON, and the Worker commits
a file straight into the `TestCloudCannon` GitHub repo:

- `POST /profiles` → `src/content/profiles/<slug>.json` (person/organization profile)
- `POST /pages` → `src/content/pages/<slug>.md` (a whole page built around one
  page-section component — hero banner, staff grid, card carousel, etc.)

CloudCannon watches that repo and rebuilds the Astro site automatically on
every push, so the new page appears live shortly after the API call — no
manual file drop, no local `npm run add`.

```
Client  --POST /profiles or /pages-->  Cloudflare Worker  --commit via GitHub API-->  GitHub repo
                                                                                             |
                                                                                             v
                                                                                CloudCannon detects push,
                                                                                rebuilds & publishes site
```

The Worker itself holds no state — it's a thin, authenticated translator from
"JSON in" to "file committed on the right branch."

---

## 1. One-time setup

You need two things before deploying: a GitHub token the Worker can use to
write files, and a Cloudflare account to host the Worker.

### 1a. Create a GitHub Personal Access Token

Use a **fine-grained token** scoped to just this repo — safer than a classic
token with full account access.

1. Go to https://github.com/settings/tokens?type=beta and click **Generate new token**.
2. **Repository access** → "Only select repositories" → choose `srideepalla/TestCloudCannon`.
3. **Permissions** → **Repository permissions** → set **Contents** to **Read and write**. Leave everything else as "No access."
4. Set an expiration (90 days is a reasonable default — you'll need to rotate it and re-run `wrangler secret put GITHUB_TOKEN` when it expires).
5. Click **Generate token** and copy it immediately (GitHub only shows it once). It looks like `github_pat_...`.

### 1b. Get a Cloudflare account + Wrangler

1. Sign up (free tier is fine) at https://dash.cloudflare.com/sign-up if you don't have an account.
2. From this folder, install dependencies:
   ```sh
   cd workers/profiles-api
   npm install
   ```
3. Log in to Cloudflare from the CLI (opens a browser window to authorize):
   ```sh
   npx wrangler login
   ```

---

## 2. Configure and deploy

`wrangler.toml` already has the non-secret config pointed at this repo:

```toml
GITHUB_OWNER = "srideepalla"
GITHUB_REPO = "TestCloudCannon"
GITHUB_BRANCH = "profiles-directory"
SITE_URL = "https://women.stevieawards.com"
```

`GITHUB_BRANCH` is set to `profiles-directory` for now. **Once you've tested
the API and are ready for submissions to go live**, either merge
`profiles-directory` into whichever branch CloudCannon actually builds from
production, or change `GITHUB_BRANCH` here to that branch and redeploy —
only commits on the branch CloudCannon is connected to will show up on the
live site.

Two secrets are **not** in `wrangler.toml` (never commit real secrets to
git) — set them directly on the Cloudflare account instead:

```sh
npx wrangler secret put API_TOKEN
# paste a long random string when prompted, e.g. generate one with:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Save this value — callers must send it as `Authorization: Bearer <this value>`.

npx wrangler secret put GITHUB_TOKEN
# paste the github_pat_... token from step 1a
```

Deploy:

```sh
npx wrangler deploy
```

Wrangler prints the live URL, something like:

```
https://stevie-profiles-api.<your-subdomain>.workers.dev
```

That's your API base URL.

---

## 3. Using the API

### Create a profile

```sh
curl -X POST "https://stevie-profiles-api.<your-subdomain>.workers.dev/profiles" \
  -H "Authorization: Bearer <API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d @profile.json
```

`profile.json` must have `type` (`"person"` or `"organization"`) and `name`.
Every other field from the profiles content schema
(`src/content.config.ts`) is optional and passed through as-is:

| Field | Type | Notes |
|---|---|---|
| `type` | `"person" \| "organization"` | required |
| `name` | string | required |
| `slug` | string | optional — filename override; defaults to a slugified `name`. Stripped before the file is written. |
| `headline`, `eyebrow`, `tagline`, `summary`, `bio` | string | |
| `role`, `affiliation`, `location`, `email`, `phone`, `website` | string | |
| `badge` | `{ primary, secondary, tertiary }` | |
| `photo` | `{ source, alt }` | |
| `socialLinks` | `[{ platform, url }]` | |
| `details` | `[{ label, value }]` | |
| `tags` | string[] | |
| `sections` | array of typed blocks (`stats`, `qa`, `links`, `quotes`, `prose`, `timeline`, `details`) — see existing files in `src/content/profiles/` for shape examples | |
| `description`, `image` | string | SEO fields |
| `draft` | boolean | keep the profile out of listings until ready |

On success:

```json
{
  "slug": "global-touch",
  "path": "src/content/profiles/global-touch.json",
  "branch": "profiles-directory",
  "url": "https://women.stevieawards.com/profiles/global-touch",
  "commit": { "sha": "...", "url": "https://github.com/..." },
  "created": true
}
```

### Read a profile

```sh
curl "https://stevie-profiles-api.<your-subdomain>.workers.dev/profiles/donna-dror"
```

Public, no auth required — it just re-serves the already-published JSON from
`src/content/profiles/<slug>.json` (proxied from
`raw.githubusercontent.com`, so it doesn't touch `GITHUB_TOKEN` or its rate
limit). 404s if the slug doesn't exist, 400s if the slug contains anything
other than lowercase letters, numbers, and hyphens. Useful for any external
tool that wants to read a profile's JSON without touching GitHub directly.

### Updating an existing profile

By default the API refuses to overwrite a file that already exists (`409
Conflict`). Pass `?overwrite=true` to replace it:

```sh
curl -X POST ".../profiles?overwrite=true" \
  -H "Authorization: Bearer <API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d @profile.json
```

### Create a page from a component

`POST /pages` builds a whole page around a single CloudCannon page-section
component — the same components available in CloudCannon's "Add Section"
picker (`.cloudcannon/structures/pageSections.cloudcannon.structures.yml`).
It writes `src/content/pages/<slug>.md` with frontmatter
`pageSections: [{ _component: <component>, ...data }]`, which `[...slug].astro`
already renders through `MainComponent` / `renderBlock.astro` — the exact
pipeline that runs when an editor adds that component by hand inside
CloudCannon. No new collection, route, or CloudCannon config was needed.

```sh
curl -X POST "https://stevie-profiles-api.<your-subdomain>.workers.dev/pages" \
  -H "Authorization: Bearer <API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "component": "page-sections/people/staff-grid",
    "title": "Our Team",
    "data": { "heading": "Our Team", "items": [] }
  }'
```

| Field | Type | Notes |
|---|---|---|
| `component` | string | required — one of the values below |
| `title` | string | required — page `<title>`; also the default slug source |
| `slug` | string | optional — filename/URL override; defaults to a slugified `title` |
| `pageHeading`, `description`, `image` | string | optional page metadata |
| `draft` | boolean | keep the page out of listings until ready |
| `data` | object | required — the component's own props, passed through as-is (see the component's `*.cloudcannon.inputs.yml` for its field shape) |

Supported `component` values:

| Value | Label |
|---|---|
| `page-sections/builders/custom-section` | Custom Section |
| `page-sections/carousels/card-carousel` | Card Carousel |
| `page-sections/carousels/embed-gallery` | Embed Gallery |
| `page-sections/carousels/gallery-carousel` | Event Gallery Carousel |
| `page-sections/features/feature-logo-scroller` | Feature Logo Scroller |
| `page-sections/features/grid-calendar` | Grid Calendar |
| `page-sections/features/grid-testimonials` | Grid Testimonials |
| `page-sections/features/grid-videos` | Grid Videos |
| `page-sections/features/split-list-form` | Split List Form |
| `page-sections/heroes/hero-banner` | Hero Banner |
| `page-sections/heroes/hero-calendar` | Hero Calendar |
| `page-sections/people/staff-grid` | Staff Grid |
| `page-sections/people/profile-section` | Profile |

For `page-sections/people/profile-section`, `data` isn't the profile itself —
it's `{ jsonFile?, data?, colorScheme? }`. Set `data.jsonFile` to the path of
a JSON file already uploaded through CloudCannon (read from disk at build
time), or set `data.data` to the profile JSON directly (same shape as
`/profiles`).

On success (same shape as `/profiles`, plus `component`):

```json
{
  "slug": "our-team",
  "component": "page-sections/people/staff-grid",
  "path": "src/content/pages/our-team.md",
  "branch": "profiles-directory",
  "url": "https://women.stevieawards.com/our-team",
  "commit": { "sha": "...", "url": "https://github.com/..." },
  "created": true
}
```

Pass `?overwrite=true` to replace an existing page at that slug, same as `/profiles`.

### Health check (no auth)

```sh
curl https://stevie-profiles-api.<your-subdomain>.workers.dev/
```

### Browser form (no curl needed)

Visit `https://stevie-profiles-api.<your-subdomain>.workers.dev/` (or `/new`)
in a browser for a simple form: pick a **Component** — either "Profile
(person / organization)" or one of the page-section components above — paste
your API token once (optionally "remember" it on that device via
`localStorage`), fill in the title/slug (for page components) and the JSON
data, click **Format & validate** to catch typos, then **Submit**. It calls
`POST /profiles` or `POST /pages` under the hood depending on the component
you picked, and shows the resulting page link or the error message. The
token you type is never stored server-side — it only lives in your browser.

---

## 4. Local development

```sh
cp .dev.vars.example .dev.vars
# fill in real values in .dev.vars (this file is gitignored)
npm run dev
```

This runs the Worker on `http://localhost:8787` and still talks to the real
GitHub API — test against a throwaway branch first if you don't want to
touch `profiles-directory` while iterating.

## 5. Notes / follow-ups

- **CORS** is currently open (`Access-Control-Allow-Origin: *`) so the
  endpoint can be called from a browser-based form if you build one later.
  Since the bearer token still gates writes, this is safe, but tighten it to
  a specific origin if you add a public-facing form.
- **Token rotation**: the GitHub PAT expires per whatever you set in step
  1a. Re-run `wrangler secret put GITHUB_TOKEN` with a fresh token before it
  expires, or the API will start returning `502` on every write.
- **Custom domain**: by default the Worker is served from
  `*.workers.dev`. If you want it under `women.stevieawards.com/api/...`
  instead, add a Worker Route in the Cloudflare dashboard once that domain's
  DNS is on Cloudflare.
