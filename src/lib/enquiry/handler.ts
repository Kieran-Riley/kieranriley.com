import { successMessage } from '../../data/enquiry';
import { confirmationEmail, notificationEmail, type SendEmail } from './email';
import { validateEnquiry, getString, type FieldErrors, type RawInput } from './validate';

export interface EnquiryConfig {
  sendEmail: SendEmail | null;
  toEmail?: string;
  fromEmail?: string;
  turnstileSecret?: string;
  rateLimiter: RateLimiter;
  fetchImpl?: typeof fetch;
  logger?: Pick<Console, 'error' | 'warn' | 'info'>;
  now?: () => number;
}

export interface EnquiryResponseBody {
  ok: boolean;
  message: string;
  errors?: FieldErrors;
}

/** Minimum time (ms) between the form loading and being submitted. Faster than this is almost certainly a bot. */
export const MIN_FILL_TIME_MS = 3000;
export const HONEYPOT_FIELD = 'fax_number';
const MAX_LINKS_IN_DESCRIPTION = 5;

/**
 * A small fixed-window rate limiter kept in memory. This is enough for a single
 * server instance; if the site is scaled to several instances, swap this for a
 * shared store.
 */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();
  constructor(
    private limit = 5,
    private windowMs = 15 * 60 * 1000,
    private now: () => number = Date.now,
  ) {}

  /** Returns true if the request is allowed. */
  take(key: string): boolean {
    const t = this.now();
    if (this.hits.size > 5000) {
      for (const [k, v] of this.hits) if (v.resetAt <= t) this.hits.delete(k);
    }
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= t) {
      this.hits.set(key, { count: 1, resetAt: t + this.windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= this.limit;
  }
}

async function verifyTurnstile(
  secret: string,
  token: string,
  ip: string | undefined,
  fetchImpl: typeof fetch,
): Promise<boolean> {
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);
  try {
    const res = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

async function readBody(request: Request): Promise<RawInput | null> {
  const type = request.headers.get('content-type') ?? '';
  try {
    if (type.includes('application/json')) {
      const json = await request.json();
      return json && typeof json === 'object' && !Array.isArray(json) ? (json as Record<string, unknown>) : null;
    }
    if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
      return await request.formData();
    }
  } catch {
    return null;
  }
  return null;
}

export interface HandlerResult {
  status: number;
  body: EnquiryResponseBody;
}

export async function processEnquiry(
  request: Request,
  clientIp: string | undefined,
  config: EnquiryConfig,
): Promise<HandlerResult> {
  const log = config.logger ?? console;
  const now = config.now ?? Date.now;
  const fetchImpl = config.fetchImpl ?? fetch;

  if (!config.rateLimiter.take(clientIp ?? 'unknown')) {
    return {
      status: 429,
      body: {
        ok: false,
        message: 'You’ve sent a few enquiries in a short space of time. Please wait a little while and try again.',
      },
    };
  }

  const input = await readBody(request);
  if (!input) {
    return { status: 400, body: { ok: false, message: 'Sorry, that request couldn’t be read. Please try again.' } };
  }

  // Spam checks. Bots that trip these get a normal-looking success response,
  // so they don't learn what gave them away.
  const fakeSuccess: HandlerResult = { status: 200, body: { ok: true, message: successMessage } };
  if (getString(input, HONEYPOT_FIELD).trim()) return fakeSuccess;
  const startedAt = Number(getString(input, 'startedAt'));
  if (Number.isFinite(startedAt) && startedAt > 0 && now() - startedAt < MIN_FILL_TIME_MS) return fakeSuccess;

  if (config.turnstileSecret) {
    const token = getString(input, 'cf-turnstile-response');
    if (!(await verifyTurnstile(config.turnstileSecret, token, clientIp, fetchImpl))) {
      return {
        status: 400,
        body: {
          ok: false,
          message: 'Sorry, I couldn’t confirm you’re not a bot. Please refresh the page and try again.',
        },
      };
    }
  }

  const result = validateEnquiry(input);
  if (!result.ok) {
    return {
      status: 422,
      body: { ok: false, message: 'Please check the highlighted fields and try again.', errors: result.errors },
    };
  }

  const enquiry = result.data;
  if ((enquiry.description.match(/https?:\/\//gi) ?? []).length > MAX_LINKS_IN_DESCRIPTION) {
    return {
      status: 422,
      body: {
        ok: false,
        message: 'Please check the highlighted fields and try again.',
        errors: { description: 'Please include fewer links — you can share more once we’re talking.' },
      },
    };
  }

  if (!config.sendEmail || !config.toEmail || !config.fromEmail) {
    log.error('[enquiry] Email is not configured. Set RESEND_API_KEY, ENQUIRY_TO_EMAIL and ENQUIRY_FROM_EMAIL.');
    return {
      status: 503,
      body: {
        ok: false,
        message: 'Sorry, the enquiry form isn’t working right now. Please try again later or contact me on LinkedIn.',
      },
    };
  }

  try {
    await config.sendEmail(notificationEmail(enquiry, { from: config.fromEmail, to: config.toEmail }));
  } catch (err) {
    log.error('[enquiry] Failed to send notification email', err);
    return {
      status: 502,
      body: {
        ok: false,
        message:
          'Sorry, something went wrong sending your enquiry. Please try again in a few minutes, or contact me on LinkedIn.',
      },
    };
  }

  // The enquiry has reached me at this point, so a failed confirmation shouldn't
  // be reported to the visitor as a failed submission.
  try {
    await config.sendEmail(confirmationEmail(enquiry, { from: config.fromEmail, replyTo: config.toEmail }));
  } catch (err) {
    log.warn('[enquiry] Notification sent but confirmation email failed', err);
  }

  return { status: 200, body: { ok: true, message: successMessage } };
}
