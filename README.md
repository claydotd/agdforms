# agdforms

Netlify-hosted client forms for Analogue Gone Digital sites (including FoMBL at `/fombl/`).

Live site: https://agdforms.netlify.app

## FoMBL Decap CMS

The FoMBL content admin UI is hosted on this Netlify site so GitHub login can finish:

**https://agdforms.netlify.app/fombl-cms/**

Netlify only returns the OAuth token to this site’s own origin. Opening the CMS on GitHub Pages (`analoguegonedigital.co.uk`) authorizes successfully but then stalls — that is why the UI lives here. Saves still commit to `claydotd/fombl` on GitHub.

Files: [`fombl-cms/`](fombl-cms/) (keep in sync with `fombl` repo `public/admin/` when collections change). Collections: Meetings & Events, Volunteering, News.

### One-time OAuth setup

1. Create a GitHub OAuth App with callback `https://api.netlify.com/auth/done`.
2. In Netlify → this site → **Project configuration → Security → OAuth → Install Provider → GitHub**, paste the Client ID and Client Secret.

Removing or changing that provider will break FoMBL and C. M. Leslie CMS login. Config uses `site_domain: agdforms.netlify.app`.

## C. M. Leslie Decap CMS

The C. M. Leslie content admin UI is hosted here for the same OAuth reason:

**https://agdforms.netlify.app/cmleslie/**

Saves commit to `claydotd/cleslieauthor` on GitHub. Files: [`cmleslie/`](cmleslie/) (keep in sync with `cleslieauthor` repo `public/admin/config.yml` when collections change). Collections: Blog, Pages.

agdforms’s own `/admin` availability UI is separate and unrelated to Decap.

## Local preview

```bash
npm install
npm run dev
```
