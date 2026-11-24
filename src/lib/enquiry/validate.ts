import {
  aiHelpAreas,
  aiTools,
  budgets,
  enquiryTypes,
  limits,
  projectStages,
  supportKinds,
  timelines,
  type EnquiryType,
} from '../../data/enquiry';

export interface Enquiry {
  name: string;
  email: string;
  type: EnquiryType;
  description: string;
  company?: string;
  url?: string;
  budget?: string;
  timeline?: string;
  projectStage?: string;
  aiTools?: string[];
  aiHelp?: string[];
  currentStack?: string;
  supportKind?: string;
}

export type FieldErrors = Partial<Record<keyof Enquiry, string>>;

export type ValidationResult =
  | { ok: true; data: Enquiry }
  | { ok: false; errors: FieldErrors };

/** Any input shape we accept: FormData or a plain object from JSON. */
export type RawInput = FormData | Record<string, unknown>;

function getAll(input: RawInput, key: string): string[] {
  if (input instanceof FormData) {
    return input.getAll(key).filter((v): v is string => typeof v === 'string');
  }
  const v = input[key];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  return typeof v === 'string' ? [v] : [];
}

export function getString(input: RawInput, key: string): string {
  return getAll(input, key)[0] ?? '';
}

/**
 * Normalise free text: strip control characters (keeping newlines and tabs in
 * multi-line fields), normalise line endings and trim.
 */
export function clean(value: string, { multiline = false } = {}): string {
  let v = value.normalize('NFC').replace(/\r\n?/g, '\n');
  v = multiline
    ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u2028\u2029\uFEFF]/g, '')
    : v.replace(/[\u0000-\u001F\u007F\u200B-\u200F\u2028\u2029\uFEFF]/g, ' ').replace(/\s+/g, ' ');
  if (multiline) v = v.replace(/\n{4,}/g, '\n\n\n');
  return v.trim();
}

// Deliberately simple: one @, something either side, a dot in the domain, no spaces.
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

export function normaliseUrl(value: string): string | null {
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname.includes('.') || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function oneOf(options: ReadonlyArray<{ value: string }>, value: string): boolean {
  return options.some((o) => o.value === value);
}

export function validateEnquiry(input: RawInput): ValidationResult {
  const errors: FieldErrors = {};

  const name = clean(getString(input, 'name'));
  const email = clean(getString(input, 'email')).toLowerCase();
  const type = clean(getString(input, 'type'));
  const description = clean(getString(input, 'description'), { multiline: true });
  const company = clean(getString(input, 'company'));
  const rawUrl = clean(getString(input, 'url'));
  const budget = clean(getString(input, 'budget'));
  const timeline = clean(getString(input, 'timeline'));

  if (!name) errors.name = 'Please tell me your name.';
  else if (name.length > limits.name) errors.name = `Please keep your name under ${limits.name} characters.`;

  if (!email) errors.email = 'Please enter your email address so I can reply.';
  else if (email.length > limits.email || !EMAIL_RE.test(email))
    errors.email = 'That email address doesn’t look quite right.';

  if (!type) errors.type = 'Please choose the option that best fits your enquiry.';
  else if (!oneOf(enquiryTypes, type)) errors.type = 'Please choose one of the listed options.';

  if (!description) errors.description = 'Please tell me a little about your project.';
  else if (description.length < limits.descriptionMin)
    errors.description = 'Could you add a bit more detail? A couple of sentences is plenty.';
  else if (description.length > limits.description)
    errors.description = `Please keep this under ${limits.description.toLocaleString('en-GB')} characters. We can go into more detail later.`;

  if (company.length > limits.company) errors.company = `Please keep this under ${limits.company} characters.`;

  let url: string | undefined;
  if (rawUrl) {
    const normalised = rawUrl.length <= limits.url ? normaliseUrl(rawUrl) : null;
    if (!normalised) errors.url = 'Please enter a full web address, e.g. https://example.com';
    else url = normalised;
  }

  if (budget && !oneOf(budgets, budget)) errors.budget = 'Please choose one of the listed options.';
  if (timeline && !oneOf(timelines, timeline)) errors.timeline = 'Please choose one of the listed options.';

  const data: Enquiry = {
    name,
    email,
    type: type as EnquiryType,
    description,
    ...(company && { company }),
    ...(url && { url }),
    ...(budget && { budget }),
    ...(timeline && { timeline }),
  };

  // Follow-up questions only apply to their own enquiry type; anything else is ignored.
  if (type === 'new-build') {
    const stage = clean(getString(input, 'projectStage'));
    if (stage && !oneOf(projectStages, stage)) errors.projectStage = 'Please choose one of the listed options.';
    else if (stage) data.projectStage = stage;
  }

  if (type === 'ai-project') {
    const tools = [...new Set(getAll(input, 'aiTools').map((v) => clean(v)))];
    const help = [...new Set(getAll(input, 'aiHelp').map((v) => clean(v)))];
    if (tools.some((t) => !oneOf(aiTools, t))) errors.aiTools = 'Please choose from the listed tools.';
    else if (tools.length) data.aiTools = tools;
    if (help.some((h) => !oneOf(aiHelpAreas, h))) errors.aiHelp = 'Please choose from the listed options.';
    else if (help.length) data.aiHelp = help;
  }

  if (type === 'modernise') {
    const stack = clean(getString(input, 'currentStack'));
    if (stack.length > limits.currentStack)
      errors.currentStack = `Please keep this under ${limits.currentStack} characters.`;
    else if (stack) data.currentStack = stack;
  }

  if (type === 'advice-support') {
    const kind = clean(getString(input, 'supportKind'));
    if (kind && !oneOf(supportKinds, kind)) errors.supportKind = 'Please choose one of the listed options.';
    else if (kind) data.supportKind = kind;
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
}
