# kieranriley.com

Personal website for Kieran Riley, a freelance full-stack software developer. It has two main pages, About (`/`) and Work With Me (`/work-with-me`), plus a working enquiry form.

Built with [Astro](https://astro.build). Every page is prerendered to static HTML. Only the enquiry endpoint (`/api/enquiry`) runs on the server, using the Node adapter.

## Getting started

```sh
npm install
cp .env.example .env   # optional for local dev
npm run dev            # http://localhost:4321
```

In development, if `RESEND_API_KEY` isn't set, enquiry emails are printed to the terminal instead of being sent.

| Command           | What it does                                    |
| ----------------- | ----------------------------------------------- |
| `npm run dev`     | Start the dev server                            |
| `npm run build`   | Build to `dist/`                                |
| `npm start`       | Run the built site (`dist/server/entry.mjs`)    |
| `npm test`        | Run the enquiry validation and endpoint tests   |
| `npm run check`   | Type-check the project                          |

## Editing content

Most of the editable content lives in `src/data/`:

- `site.ts`: name, location, social links, navigation, privacy contact and retention period
- `services.ts`: the four services and the "How I work" principles
- `enquiry.ts`: enquiry types, budget and timeline options, follow-up questions and the success message. The server validates against these same lists, so the form and the validation can't drift apart.

Page copy is in `src/pages/index.astro` and `src/pages/work-with-me.astro`. Photos are in `src/assets/images/` and are resized and converted to WebP at build time.

`public/og-image.jpg` is the social sharing image (1200×630).

## Enquiry form

`src/pages/api/enquiry.ts` → `src/lib/enquiry/`

1. Inputs are validated and cleaned on the server. The browser runs the same checks for quick feedback.
2. A notification email goes to `ENQUIRY_TO_EMAIL` via [Resend](https://resend.com), with reply-to set to the visitor.
3. The visitor gets a confirmation email. It contains only fixed text and their first name, so the form can't be used to send arbitrary content to third parties.
4. Spam protection (`src/lib/enquiry/handler.ts` and `spam.ts`):
   - **Honeypot:** a hidden field that people never see but bots fill in. Those submissions are quietly dropped.
   - **JavaScript check:** the page adds a timestamp when it loads. Posts without one (most bots) are rejected, and forms filled in under 3 seconds are dropped.
   - **Spam phrases:** messages that match two or more common spam patterns (SEO offers, crypto, "dear website owner" and so on) are dropped. One match still reaches you, with `[Possible spam]` in the subject and no confirmation sent. Add phrases to `spam.ts` if anything gets through.
   - **Links:** messages with more than 3 links are dropped.
   - **Rate limit:** 3 enquiries per hour from one IP address (in memory).
   - **Origin check:** Astro rejects posts from other websites.
   - **Cloudflare Turnstile (optional):** a free, mostly invisible challenge. Worth turning on if spam still gets through.

   Dropped spam gets a normal "thanks" response, so bots can't tell what caught them.
5. The form needs JavaScript to send. Visitors without it see a note pointing them to LinkedIn.

## Environment variables

| Variable                    | Required          | Notes                                                                     |
| --------------------------- | ----------------- | ------------------------------------------------------------------------- |
| `RESEND_API_KEY`            | Yes (production)  | Server only. Never sent to the browser.                                   |
| `ENQUIRY_TO_EMAIL`          | Yes (production)  | Where new enquiries are delivered.                                        |
| `ENQUIRY_FROM_EMAIL`        | Yes (production)  | e.g. `Kieran Riley <hello@kieranriley.com>`. The domain must be verified in Resend. |
| `SITE_URL`                  | Build time        | Defaults to `https://kieranriley.com`. Used for canonical URLs, Open Graph tags and the sitemap. |
| `ALLOWED_DOMAINS`           | Build time        | Extra hostnames to accept, comma-separated (e.g. a `*.up.railway.app` preview domain). |
| `PUBLIC_TURNSTILE_SITE_KEY` | Optional, build   | Set both Turnstile keys to turn on the Turnstile challenge.                |
| `TURNSTILE_SECRET_KEY`      | Optional          |                                                                           |
| `PORT`                      | Set by host       | The port the server listens on.                                           |

## Deployment

The site runs as a single Node server (Node 22.23.4 or later) on any host that can run `npm run build` and `npm start`, such as Railway, Render, Fly.io or a VPS. Railway picks up these commands automatically. Set the environment variables above, then point the domain at the service.

> **Note:** GitHub Pages can only serve static files, so it can't run the enquiry endpoint. Set up the new host before you merge this to the branch GitHub Pages deploys from.

To use Vercel, Netlify or Cloudflare instead, swap `@astrojs/node` in `astro.config.mjs` for that platform's adapter. The enquiry logic in `src/lib/enquiry/` doesn't depend on the framework or the host.

The in-memory rate limiter assumes a single server instance. If you scale to several, move it to a shared store.

## SEO

- Each page has its own title, description and canonical URL, plus Open Graph and Twitter tags.
- JSON-LD structured data: `ProfilePage`/`Person` and `WebSite` on the homepage, and a service catalogue on Work With Me.
- `sitemap-index.xml` (via `@astrojs/sitemap`) and `robots.txt`.
- For Search Console, verify with a DNS record, or put the HTML-tag value in `site.googleSiteVerification`.
