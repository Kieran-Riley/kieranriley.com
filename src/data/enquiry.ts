/**
 * Options for the enquiry form. These are used both to render the form and to
 * validate submissions on the server, so anything added here is accepted
 * automatically.
 */
export const enquiryTypes = [
  { value: 'new-build', label: 'I want something built from scratch' },
  { value: 'ai-project', label: 'I’ve started building something with AI' },
  { value: 'modernise', label: 'I want to modernise existing software' },
  { value: 'advice-support', label: 'I need technical advice or ongoing support' },
  { value: 'other', label: 'Something else' },
] as const;

export type EnquiryType = (typeof enquiryTypes)[number]['value'];

export const budgets = [
  { value: 'not-sure', label: 'Not sure yet' },
  { value: 'under-2k', label: 'Under £2,000' },
  { value: '2k-5k', label: '£2,000 – £5,000' },
  { value: '5k-15k', label: '£5,000 – £15,000' },
  { value: '15k-plus', label: '£15,000+' },
] as const;

export const timelines = [
  { value: 'flexible', label: 'No fixed timeline' },
  { value: 'asap', label: 'As soon as possible' },
  { value: '1-3-months', label: 'In the next 1–3 months' },
  { value: '3-plus-months', label: 'More than 3 months away' },
] as const;

/** Extra question for "built from scratch" enquiries. */
export const projectStages = [
  { value: 'idea', label: 'It’s just an idea at the moment' },
  { value: 'planned', label: 'I have notes, a spec or designs' },
  { value: 'in-progress', label: 'Something is already partly built' },
] as const;

/** Extra questions for AI-project enquiries. */
export const aiTools = [
  { value: 'lovable', label: 'Lovable' },
  { value: 'replit', label: 'Replit' },
  { value: 'bolt', label: 'Bolt' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'codex', label: 'Codex' },
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'v0', label: 'v0' },
  { value: 'other', label: 'Something else' },
] as const;

export const aiHelpAreas = [
  { value: 'review', label: 'Code or security review' },
  { value: 'deploy', label: 'Hosting and deployment' },
  { value: 'auth-data', label: 'Authentication or databases' },
  { value: 'features', label: 'Adding features' },
  { value: 'fixing', label: 'Fixing bugs or things that keep breaking' },
  { value: 'mobile', label: 'Turning it into a mobile app' },
  { value: 'guidance', label: 'Guidance so I can keep building myself' },
  { value: 'unsure', label: 'Not sure — I’d like advice' },
] as const;

/** Extra question for advice/support enquiries. */
export const supportKinds = [
  { value: 'one-off', label: 'A one-off session or review' },
  { value: 'ongoing', label: 'Ongoing or occasional support' },
  { value: 'unsure', label: 'Not sure yet' },
] as const;

export const limits = {
  name: 100,
  email: 254,
  company: 150,
  url: 300,
  description: 5000,
  descriptionMin: 20,
  currentStack: 300,
} as const;

export const successMessage =
  'Thanks for getting in touch! I’ll review your enquiry and aim to get back to you within two working days.';

export function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string | undefined | null,
): string | undefined {
  return options.find((o) => o.value === value)?.label;
}
