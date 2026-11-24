// @ts-check
import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

// The public URL of the site. Used for canonical URLs, Open Graph tags and the sitemap.
// Override with SITE_URL if the site is deployed somewhere else (e.g. a staging domain).
const SITE_URL = process.env.SITE_URL || 'https://kieranriley.com';
const siteHost = new URL(SITE_URL).hostname;

// Hostnames the server will answer to. Astro uses this to check that form posts
// come from this site (CSRF protection) and to trust proxy headers such as the
// visitor's IP address. Add extra hosts (e.g. a Railway or staging domain) with
// ALLOWED_DOMAINS=foo.up.railway.app,staging.example.com
const allowedHosts = [
  siteHost,
  `www.${siteHost.replace(/^www\./, '')}`,
  ...(process.env.ALLOWED_DOMAINS || '').split(',').map((h) => h.trim()).filter(Boolean),
];

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'never',
  build: { format: 'file' },
  // Pages are prerendered to static HTML. Only the enquiry endpoint runs on the server.
  output: 'static',
  security: {
    checkOrigin: true,
    allowedDomains: [
      ...allowedHosts.map((hostname) => ({ hostname, protocol: 'https' })),
      // Local development and `npm run preview`.
      { hostname: 'localhost' },
      { hostname: '127.0.0.1' },
    ],
  },
  adapter: node({ mode: 'standalone', bodySizeLimit: 64 * 1024 }),
  // Listen on all interfaces so the server is reachable inside a container. PORT is read from the environment.
  server: { host: true },
  integrations: [
    sitemap({
      filter: (page) => !/\/(enquiry-sent|404)$/.test(page.replace(/\/$/, '')),
    }),
  ],
  env: {
    schema: {
      // Resend API key. Server only, never sent to the browser.
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Where enquiry notifications are delivered.
      ENQUIRY_TO_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Verified sender, e.g. "Kieran Riley <hello@kieranriley.com>".
      ENQUIRY_FROM_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Optional Cloudflare Turnstile spam protection. Leave both unset to disable.
      TURNSTILE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },
});
