import { describe, expect, it, vi } from 'vitest';
import { validateEnquiry, normaliseUrl, clean } from '../src/lib/enquiry/validate';
import { processEnquiry, RateLimiter, HONEYPOT_FIELD } from '../src/lib/enquiry/handler';
import { confirmationEmail, notificationEmail, escapeHtml, type EmailMessage } from '../src/lib/enquiry/email';
import { spamScore } from '../src/lib/enquiry/spam';

const valid = {
  name: 'Ada Lovelace',
  email: 'Ada@Example.com',
  type: 'ai-project',
  description: 'I built a booking app in Lovable and need help getting it ready for real users.',
};

// A realistic page-load timestamp (well over the minimum fill time ago).
const loadedAt = () => String(Date.now() - 60_000);

function jsonRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/enquiry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ startedAt: loadedAt(), ...body }),
  });
}

function setup(overrides: Partial<Parameters<typeof processEnquiry>[2]> = {}) {
  const sent: EmailMessage[] = [];
  const config = {
    sendEmail: vi.fn(async (m: EmailMessage) => void sent.push(m)),
    toEmail: 'me@example.com',
    fromEmail: 'Site <site@example.com>',
    rateLimiter: new RateLimiter(5, 60_000),
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
    ...overrides,
  };
  return { config, sent };
}

describe('validateEnquiry', () => {
  it('accepts a valid enquiry and normalises it', () => {
    const r = validateEnquiry({ ...valid, aiTools: ['lovable', 'cursor'], url: 'example.com/app' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.email).toBe('ada@example.com');
    expect(r.data.aiTools).toEqual(['lovable', 'cursor']);
    expect(r.data.url).toBe('https://example.com/app');
  });

  it('reports missing required fields', () => {
    const r = validateEnquiry({});
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(['description', 'email', 'name', 'type']);
  });

  it('rejects unknown option values and bad emails', () => {
    const r = validateEnquiry({ ...valid, email: 'not-an-email', type: 'hack', budget: '1m' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.email).toBeTruthy();
    expect(r.errors.type).toBeTruthy();
    expect(r.errors.budget).toBeTruthy();
  });

  it('ignores follow-up fields that belong to a different enquiry type', () => {
    const r = validateEnquiry({ ...valid, type: 'modernise', aiTools: ['lovable'], currentStack: 'PHP' });
    expect(r.ok && r.data.aiTools).toBeFalsy();
    expect(r.ok && r.data.currentStack).toBe('PHP');
  });

  it('works with FormData including repeated checkbox values', () => {
    const fd = new FormData();
    Object.entries(valid).forEach(([k, v]) => fd.append(k, v));
    fd.append('aiHelp', 'deploy');
    fd.append('aiHelp', 'review');
    const r = validateEnquiry(fd);
    expect(r.ok && r.data.aiHelp).toEqual(['deploy', 'review']);
  });

  it('strips control characters and collapses whitespace in single-line fields', () => {
    expect(clean('  Ada\r\n\u0000Lovelace  ')).toBe('Ada Lovelace');
    expect(clean('line one\r\nline two', { multiline: true })).toBe('line one\nline two');
  });

  it('only accepts http(s) URLs', () => {
    expect(normaliseUrl('javascript:alert(1)')).toBeNull();
    expect(normaliseUrl('https://user:pw@example.com')).toBeNull();
    expect(normaliseUrl('github.com/me/repo')).toBe('https://github.com/me/repo');
  });
});

describe('spamScore', () => {
  it('ignores ordinary enquiries', () => {
    expect(spamScore(valid.description)).toBe(0);
    expect(spamScore('We need to modernise our old stock control system, built in PHP.')).toBe(0);
  });
});

describe('emails', () => {
  it('escapes HTML in the notification and sets reply-to', () => {
    const r = validateEnquiry({ ...valid, name: '<script>x</script>' });
    if (!r.ok) throw new Error('expected valid');
    const msg = notificationEmail(r.data, { from: 'a@b.co', to: 'me@b.co' });
    expect(msg.html).not.toContain('<script>');
    expect(msg.html).toContain(escapeHtml('<script>x</script>'));
    expect(msg.replyTo).toBe('ada@example.com');
  });

  it('never includes the visitor’s message in the confirmation', () => {
    const r = validateEnquiry({ ...valid, description: 'Buy cheap things at http://spam.example now please' });
    if (!r.ok) throw new Error('expected valid');
    const msg = confirmationEmail(r.data, { from: 'a@b.co' });
    expect(msg.to).toEqual(['ada@example.com']);
    expect(msg.text).not.toContain('spam.example');
    expect(msg.text).toContain('Hi Ada,');
  });
});

describe('processEnquiry', () => {
  it('sends a notification and a confirmation', async () => {
    const { config, sent } = setup();
    const res = await processEnquiry(jsonRequest(valid), '1.2.3.4', config);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(sent.map((m) => m.to[0])).toEqual(['me@example.com', 'ada@example.com']);
  });

  it('returns field errors for invalid input without sending', async () => {
    const { config, sent } = setup();
    const res = await processEnquiry(jsonRequest({ ...valid, email: 'nope' }), '1.2.3.4', config);
    expect(res.status).toBe(422);
    expect(res.body.errors?.email).toBeTruthy();
    expect(sent).toHaveLength(0);
  });

  it('silently drops honeypot submissions', async () => {
    const { config, sent } = setup();
    const res = await processEnquiry(jsonRequest({ ...valid, [HONEYPOT_FIELD]: 'x' }), '1.2.3.4', config);
    expect(res.body.ok).toBe(true);
    expect(sent).toHaveLength(0);
  });

  it('silently drops submissions made too quickly after page load', async () => {
    const { config, sent } = setup({ now: () => 10_000 });
    const res = await processEnquiry(jsonRequest({ ...valid, startedAt: '9000' }), '1.2.3.4', config);
    expect(res.body.ok).toBe(true);
    expect(sent).toHaveLength(0);
  });

  it('rejects submissions that skipped the page’s JavaScript', async () => {
    const { config, sent } = setup();
    const res = await processEnquiry(jsonRequest({ ...valid, startedAt: '' }), '1.2.3.4', config);
    expect(res.status).toBe(400);
    expect(sent).toHaveLength(0);
  });

  it('quietly drops obvious sales spam', async () => {
    const { config, sent } = setup();
    const description = 'Dear website owner, we can get you on the first page of Google with our SEO backlinks.';
    const res = await processEnquiry(jsonRequest({ ...valid, type: 'other', description }), '1.2.3.4', config);
    expect(res.body.ok).toBe(true);
    expect(sent).toHaveLength(0);
  });

  it('delivers borderline enquiries marked as possible spam, without a confirmation', async () => {
    const { config, sent } = setup();
    const description = 'I need a new website for my bakery and would like it to have good SEO.';
    const res = await processEnquiry(jsonRequest({ ...valid, type: 'new-build', description }), '1.2.3.4', config);
    expect(res.body.ok).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toMatch(/^\[Possible spam\]/);
  });

  it('quietly drops link-stuffed messages', async () => {
    const { config, sent } = setup();
    const description = 'See https://a.example https://b.example https://c.example https://d.example now';
    const res = await processEnquiry(jsonRequest({ ...valid, description }), '1.2.3.4', config);
    expect(res.body.ok).toBe(true);
    expect(sent).toHaveLength(0);
  });

  it('rate limits repeated submissions from one address', async () => {
    const { config } = setup({ rateLimiter: new RateLimiter(2, 60_000) });
    await processEnquiry(jsonRequest(valid), '9.9.9.9', config);
    await processEnquiry(jsonRequest(valid), '9.9.9.9', config);
    const res = await processEnquiry(jsonRequest(valid), '9.9.9.9', config);
    expect(res.status).toBe(429);
  });

  it('reports a failure if the notification cannot be sent', async () => {
    const { config } = setup({ sendEmail: vi.fn().mockRejectedValue(new Error('down')) });
    const res = await processEnquiry(jsonRequest(valid), '1.2.3.4', config);
    expect(res.status).toBe(502);
    expect(res.body.ok).toBe(false);
  });

  it('still succeeds if only the confirmation fails', async () => {
    const sendEmail = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('bounce'));
    const { config } = setup({ sendEmail });
    const res = await processEnquiry(jsonRequest(valid), '1.2.3.4', config);
    expect(res.status).toBe(200);
    expect(config.logger.warn).toHaveBeenCalled();
  });

  it('refuses to accept enquiries when email is not configured', async () => {
    const { config } = setup({ sendEmail: null });
    const res = await processEnquiry(jsonRequest(valid), '1.2.3.4', config);
    expect(res.status).toBe(503);
  });

  it('verifies Turnstile when a secret is configured', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ success: false }))) as unknown as typeof fetch;
    const { config, sent } = setup({ turnstileSecret: 'secret', fetchImpl });
    const res = await processEnquiry(jsonRequest({ ...valid, 'cf-turnstile-response': 'tok' }), '1.2.3.4', config);
    expect(res.status).toBe(400);
    expect(sent).toHaveLength(0);
  });
});
