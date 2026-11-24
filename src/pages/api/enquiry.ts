import type { APIRoute } from 'astro';
import {
  ENQUIRY_FROM_EMAIL,
  ENQUIRY_TO_EMAIL,
  RESEND_API_KEY,
  TURNSTILE_SECRET_KEY,
} from 'astro:env/server';
import { consoleSender, createResendSender, escapeHtml } from '../../lib/enquiry/email';
import { processEnquiry, RateLimiter } from '../../lib/enquiry/handler';

// This route runs on the server for every request; everything else is static.
export const prerender = false;

const rateLimiter = new RateLimiter();
const isDev = import.meta.env.DEV;

export const POST: APIRoute = async ({ request, clientAddress, redirect }) => {
  // Astro only trusts X-Forwarded-For when the request host matches
  // `security.allowedDomains`, so this can't be spoofed by visitors.
  let address: string | undefined;
  try {
    address = clientAddress;
  } catch {
    address = undefined;
  }

  const sendEmail = RESEND_API_KEY ? createResendSender(RESEND_API_KEY) : isDev ? consoleSender : null;
  const { status, body } = await processEnquiry(request, address, {
    sendEmail,
    toEmail: ENQUIRY_TO_EMAIL ?? (isDev ? 'you@example.com' : undefined),
    fromEmail: ENQUIRY_FROM_EMAIL ?? (isDev ? 'Website <dev@example.com>' : undefined),
    turnstileSecret: TURNSTILE_SECRET_KEY,
    rateLimiter,
  });

  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  if (wantsJson) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  // Fallback for browsers without JavaScript: a plain form POST.
  if (body.ok) return redirect('/enquiry-sent', 303);

  const items = Object.values(body.errors ?? {})
    .map((e) => `<li>${escapeHtml(e)}</li>`)
    .join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Enquiry not sent — Kieran Riley</title>
<style>body{font-family:system-ui,sans-serif;background:#f6f3ee;color:#12151c;line-height:1.6;margin:0;padding:48px 20px}main{max-width:560px;margin:0 auto}a{color:#2b59c3}</style></head>
<body><main><h1>Your enquiry wasn’t sent</h1><p>${escapeHtml(body.message)}</p>${items ? `<ul>${items}</ul>` : ''}<p>Use your browser’s back button to return to the form — your answers should still be there. Or <a href="/work-with-me#enquire">start again</a>.</p></main></body></html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
};

export const ALL: APIRoute = () =>
  new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
