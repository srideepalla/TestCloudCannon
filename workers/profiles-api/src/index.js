/**
 * Cloudflare Worker: profiles-api
 *
 * POST a profile JSON document and this commits it as a new file to
 * src/content/profiles/<slug>.json on the configured GitHub branch. CloudCannon
 * watches that branch and rebuilds the Astro site automatically once the
 * commit lands, so the profile shows up at /profiles/<slug> without any
 * further action.
 *
 * Endpoints:
 *   GET  /                 health check, no auth required
 *   POST /profiles         create (or update, with ?overwrite=true) a profile
 *
 * Required secrets (see README.md):
 *   API_TOKEN     shared bearer token clients must send as `Authorization: Bearer <token>`
 *   GITHUB_TOKEN  GitHub PAT with contents:write on the target repo
 *
 * Required vars (wrangler.toml [vars], safe to keep non-secret):
 *   GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, SITE_URL
 */

const PROFILES_DIR = "src/content/profiles";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const FORM_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Add a Profile</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    background: #0f1115;
    color: #e6e8eb;
    display: flex;
    justify-content: center;
    padding: 2.5rem 1.25rem 4rem;
  }
  main { width: 100%; max-width: 780px; }
  h1 { font-size: 1.4rem; margin-bottom: 0.25rem; }
  p.lede { color: #9aa1ac; margin-top: 0; margin-bottom: 1.75rem; font-size: 0.92rem; }
  label { display: block; font-size: 0.85rem; font-weight: 600; margin: 1.1rem 0 0.35rem; }
  .hint { font-size: 0.78rem; color: #8b929c; margin: 0.15rem 0 0; }
  input[type="password"], input[type="text"] {
    width: 100%; padding: 0.6rem 0.7rem; font-size: 0.92rem;
    background: #181b21; border: 1px solid #2c313a; border-radius: 6px; color: #e6e8eb;
  }
  textarea {
    width: 100%; min-height: 340px; padding: 0.75rem;
    background: #181b21; border: 1px solid #2c313a; border-radius: 6px; color: #d6f0e3;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.85rem; line-height: 1.45; resize: vertical;
  }
  textarea:invalid, textarea.invalid { border-color: #d9534f; }
  .row { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.9rem; flex-wrap: wrap; }
  .row label { margin: 0; font-weight: 500; font-size: 0.85rem; }
  .actions { display: flex; gap: 0.6rem; margin-top: 1.25rem; flex-wrap: wrap; }
  button, .file-btn {
    cursor: pointer; border: 1px solid #2c313a; border-radius: 6px;
    padding: 0.55rem 1rem; font-size: 0.85rem; font-weight: 600;
    background: #21252d; color: #e6e8eb;
  }
  button.primary { background: #3d8b5f; border-color: #3d8b5f; color: #fff; }
  button.primary:disabled { opacity: 0.55; cursor: default; }
  button:hover:not(:disabled) { filter: brightness(1.1); }
  input[type="file"] { display: none; }
  #result {
    margin-top: 1.5rem; padding: 0.9rem 1rem; border-radius: 6px; font-size: 0.87rem;
    display: none; white-space: pre-wrap; word-break: break-word;
  }
  #result.ok { display: block; background: #16301f; border: 1px solid #2f6b47; color: #bdeecb; }
  #result.err { display: block; background: #331616; border: 1px solid #7a2d2d; color: #f5c2c2; }
  #result a { color: inherit; text-decoration: underline; }
  #jsonError { color: #f5a3a3; font-size: 0.8rem; margin-top: 0.35rem; min-height: 1em; }
</style>
</head>
<body>
<main>
  <h1>Add a Profile</h1>
  <p class="lede">Paste or load a profile JSON file below and submit. It's committed straight to the
    site's GitHub repo — CloudCannon picks up the commit and publishes it automatically.</p>

  <label for="token">API token</label>
  <input id="token" type="password" placeholder="Bearer token" autocomplete="off" />
  <div class="row">
    <input id="remember" type="checkbox" />
    <label for="remember">Remember this token on this device</label>
  </div>

  <label for="json">Profile JSON</label>
  <textarea id="json" spellcheck="false">{
  "type": "person",
  "name": ""
}</textarea>
  <div id="jsonError"></div>

  <div class="row">
    <input id="overwrite" type="checkbox" />
    <label for="overwrite">Overwrite if a profile with this name already exists</label>
  </div>

  <div class="actions">
    <label class="file-btn" for="file">Load JSON file&hellip;</label>
    <input id="file" type="file" accept="application/json,.json" />
    <button id="validateBtn" type="button">Format &amp; validate</button>
    <button id="submitBtn" class="primary" type="button">Submit</button>
  </div>

  <div id="result"></div>
</main>
<script>
(function () {
  var tokenEl = document.getElementById("token");
  var rememberEl = document.getElementById("remember");
  var jsonEl = document.getElementById("json");
  var jsonErrorEl = document.getElementById("jsonError");
  var overwriteEl = document.getElementById("overwrite");
  var fileEl = document.getElementById("file");
  var validateBtn = document.getElementById("validateBtn");
  var submitBtn = document.getElementById("submitBtn");
  var resultEl = document.getElementById("result");
  var STORAGE_KEY = "profiles_api_token";

  var savedToken = null;
  try { savedToken = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  if (savedToken) {
    tokenEl.value = savedToken;
    rememberEl.checked = true;
  }

  fileEl.addEventListener("change", function () {
    var file = fileEl.files && fileEl.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      jsonEl.value = String(reader.result);
      validateJson();
    };
    reader.readAsText(file);
  });

  function validateJson() {
    try {
      var parsed = JSON.parse(jsonEl.value);
      jsonEl.value = JSON.stringify(parsed, null, 2);
      jsonEl.classList.remove("invalid");
      jsonErrorEl.textContent = "";
      return parsed;
    } catch (err) {
      jsonEl.classList.add("invalid");
      jsonErrorEl.textContent = "Invalid JSON: " + err.message;
      return null;
    }
  }

  validateBtn.addEventListener("click", validateJson);

  function showResult(ok, message) {
    resultEl.className = ok ? "ok" : "err";
    resultEl.innerHTML = message;
  }

  submitBtn.addEventListener("click", function () {
    var token = tokenEl.value.trim();
    if (!token) {
      showResult(false, "Enter your API token first.");
      return;
    }
    var parsed = validateJson();
    if (!parsed) {
      showResult(false, "Fix the JSON errors above before submitting.");
      return;
    }

    try {
      if (rememberEl.checked) localStorage.setItem(STORAGE_KEY, token);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";
    resultEl.className = "";

    var path = "/profiles" + (overwriteEl.checked ? "?overwrite=true" : "");

    fetch(path, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok) {
          var link = result.data.url
            ? '<a href="' + result.data.url + '" target="_blank" rel="noopener">' + result.data.url + "</a>"
            : result.data.path;
          showResult(true, (result.data.created ? "Created" : "Updated") + " &mdash; " + link);
        } else {
          showResult(false, (result.data && result.data.error) || "Request failed.");
        }
      })
      .catch(function (err) {
        showResult(false, "Network error: " + err.message);
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit";
      });
  });
})();
</script>
</body>
</html>
`;

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Timing-safe-ish equality check for the shared bearer token.
function tokensMatch(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function validateProfile(data) {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return "request body must be a JSON object.";
  }
  if (data.type !== "person" && data.type !== "organization") {
    return 'the JSON must have "type": "person" or "type": "organization".';
  }
  if (!data.name || typeof data.name !== "string") {
    return 'the JSON must have a "name" (non-empty string).';
  }
  return null;
}

async function githubRequest(env, path, init = {}) {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "stevie-profiles-api",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {}),
    },
  });
  return response;
}

async function getExistingFileSha(env, filePath) {
  const response = await githubRequest(
    env,
    `contents/${filePath}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`GitHub lookup failed (${response.status}): ${await response.text()}`);
  }
  const data = await response.json();
  return data.sha ?? null;
}

async function handleCreateProfile(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const [scheme, token] = auth.split(" ");
  if (scheme !== "Bearer" || !tokensMatch(token || "", env.API_TOKEN || "")) {
    return json({ error: "Unauthorized. Send `Authorization: Bearer <API_TOKEN>`." }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const validationError = validateProfile(body);
  if (validationError) return json({ error: validationError }, 400);

  const requestedSlug = body.slug ?? body.name;
  const slug = slugify(requestedSlug);
  if (!slug) return json({ error: "Could not derive a filename slug from name/slug." }, 400);

  // Drop the transient "slug" field before writing — it's not part of the content schema.
  const { slug: _drop, ...profile } = body;

  const url = new URL(request.url);
  const overwrite = url.searchParams.get("overwrite") === "true";

  const filePath = `${PROFILES_DIR}/${slug}.json`;

  let existingSha = null;
  try {
    existingSha = await getExistingFileSha(env, filePath);
  } catch (error) {
    return json({ error: `Failed to check for an existing profile: ${error.message}` }, 502);
  }

  if (existingSha && !overwrite) {
    return json(
      {
        error: `A profile already exists at ${filePath}. Pass ?overwrite=true to replace it.`,
        slug,
      },
      409
    );
  }

  const fileContents = `${JSON.stringify(profile, null, 2)}\n`;
  const commitMessage = existingSha
    ? `Update profile: ${profile.name} (${slug})`
    : `Add profile: ${profile.name} (${slug})`;

  const putResponse = await githubRequest(env, `contents/${filePath}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: commitMessage,
      content: utf8ToBase64(fileContents),
      branch: env.GITHUB_BRANCH,
      ...(existingSha ? { sha: existingSha } : {}),
    }),
  });

  if (!putResponse.ok) {
    const errorText = await putResponse.text();
    return json({ error: `GitHub commit failed (${putResponse.status}): ${errorText}` }, 502);
  }

  const putData = await putResponse.json();

  return json(
    {
      slug,
      path: filePath,
      branch: env.GITHUB_BRANCH,
      url: env.SITE_URL ? `${env.SITE_URL.replace(/\/$/, "")}/profiles/${slug}` : undefined,
      commit: {
        sha: putData.commit?.sha,
        url: putData.commit?.html_url,
      },
      created: !existingSha,
    },
    existingSha ? 200 : 201
  );
}

function htmlResponse() {
  return new Response(FORM_PAGE, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", ...CORS_HEADERS },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method === "GET" && url.pathname === "/new") {
      return htmlResponse();
    }

    if (request.method === "GET" && url.pathname === "/") {
      const acceptsHtml = (request.headers.get("Accept") || "").includes("text/html");
      return acceptsHtml ? htmlResponse() : json({ ok: true, service: "profiles-api" });
    }

    if (request.method === "POST" && url.pathname === "/profiles") {
      return handleCreateProfile(request, env);
    }

    return json({ error: "Not found." }, 404);
  },
};
