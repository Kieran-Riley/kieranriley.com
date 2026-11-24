import {
  aiHelpAreas,
  aiTools,
  budgets,
  enquiryTypes,
  labelFor,
  projectStages,
  supportKinds,
  timelines,
} from '../../data/enquiry';
import { site } from '../../data/site';
import type { Enquiry } from './validate';

export interface EmailMessage {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

export type SendEmail = (message: EmailMessage) => Promise<void>;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Single-line, length-limited text that is safe to put in an email subject. */
function subjectSafe(value: string, max = 60): string {
  const v = value.replace(/[\r\n\t]+/g, ' ').trim();
  return v.length > max ? `${v.slice(0, max - 1)}…` : v;
}

function labels(options: ReadonlyArray<{ value: string; label: string }>, values?: string[]) {
  return values?.map((v) => labelFor(options, v) ?? v).join(', ');
}

export function enquiryRows(e: Enquiry): Array<[string, string]> {
  const rows: Array<[string, string | undefined]> = [
    ['Name', e.name],
    ['Email', e.email],
    ['Enquiry type', labelFor(enquiryTypes, e.type)],
    ['Company', e.company],
    ['Link', e.url],
    ['Budget', labelFor(budgets, e.budget)],
    ['Timeline', labelFor(timelines, e.timeline)],
    ['Project stage', labelFor(projectStages, e.projectStage)],
    ['AI tools used', labels(aiTools, e.aiTools)],
    ['Help wanted with', labels(aiHelpAreas, e.aiHelp)],
    ['Current technology', e.currentStack],
    ['Support needed', labelFor(supportKinds, e.supportKind)],
  ];
  return rows.filter((r): r is [string, string] => Boolean(r[1]));
}

const wrap = (inner: string) => `<!doctype html>
<html lang="en"><body style="margin:0;padding:24px;background:#f6f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#12151c;line-height:1.55">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e4ded4">${inner}</div>
</body></html>`;

export function notificationEmail(e: Enquiry, opts: { from: string; to: string }): EmailMessage {
  const rows = enquiryRows(e);
  const type = labelFor(enquiryTypes, e.type) ?? e.type;

  const text = [
    `New enquiry from ${e.name}`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    'Project description:',
    e.description,
    '',
    `Reply directly to this email to respond to ${e.name}.`,
  ].join('\n');

  const html = wrap(`
<p style="margin:0 0 4px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#5a6170">New enquiry</p>
<h1 style="margin:0 0 20px;font-size:22px">${escapeHtml(e.name)} — ${escapeHtml(type)}</h1>
<table role="presentation" style="width:100%;border-collapse:collapse;font-size:15px">
${rows
  .map(
    ([k, v]) =>
      `<tr><td style="padding:6px 12px 6px 0;color:#5a6170;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:6px 0;vertical-align:top">${escapeHtml(v)}</td></tr>`,
  )
  .join('\n')}
</table>
<h2 style="margin:24px 0 8px;font-size:16px">Project description</h2>
<div style="white-space:pre-wrap;font-size:15px;background:#f6f3ee;border-radius:8px;padding:16px">${escapeHtml(e.description)}</div>
<p style="margin:24px 0 0;font-size:13px;color:#5a6170">Reply directly to this email to respond to ${escapeHtml(e.name)}.</p>`);

  return {
    from: opts.from,
    to: [opts.to],
    replyTo: e.email,
    subject: subjectSafe(`New enquiry: ${type} — ${e.name}`, 120),
    text,
    html,
  };
}

/**
 * The automatic confirmation sent to the visitor. To avoid the form being used
 * to send arbitrary content to third parties, it only includes the visitor's
 * first name and fixed text — never their message.
 */
export function confirmationEmail(e: Enquiry, opts: { from: string; replyTo?: string }): EmailMessage {
  const firstName = subjectSafe(e.name.split(' ')[0] ?? '', 40);
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const paragraphs = [
    `Thanks for getting in touch! I’ve received your enquiry and I’ll review it properly before getting back to you — I aim to reply within ${site.responseTime}.`,
    'If there’s anything you’d like to add in the meantime, just reply to this email.',
    'Speak soon,',
  ];

  const text = [greeting, '', ...paragraphs.flatMap((p) => [p, '']), site.name, site.role].join('\n');
  const html = wrap(`
<p style="margin:0 0 16px">${escapeHtml(greeting)}</p>
${paragraphs.map((p) => `<p style="margin:0 0 16px">${escapeHtml(p)}</p>`).join('\n')}
<p style="margin:0">${escapeHtml(site.name)}<br><span style="color:#5a6170">${escapeHtml(site.role)}</span></p>`);

  return {
    from: opts.from,
    to: [e.email],
    subject: 'Thanks for getting in touch',
    ...(opts.replyTo && { replyTo: opts.replyTo }),
    text,
    html,
  };
}

/** Send an email through the Resend HTTP API. */
export function createResendSender(apiKey: string, fetchImpl: typeof fetch = fetch): SendEmail {
  return async (message) => {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: message.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        ...(message.replyTo && { reply_to: message.replyTo }),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Resend responded with ${res.status}: ${detail.slice(0, 300)}`);
    }
  };
}

/** Development fallback: print emails to the console instead of sending them. */
export const consoleSender: SendEmail = async (message) => {
  console.info(
    `\n[enquiry] Email not sent (no RESEND_API_KEY). Would send:\n  To: ${message.to.join(', ')}\n  Subject: ${message.subject}\n\n${message.text}\n`,
  );
};
