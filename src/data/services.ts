/**
 * The four services shown on the Work With Me page. `id` is used for anchor
 * links (e.g. /work-with-me#ai), so keep it short.
 */
export interface Service {
  id: string;
  title: string;
  summary: string;
  items: string[];
  /** Extra lines shown under the list. */
  notes?: string[];
  featured?: boolean;
}

export const services: Service[] = [
  {
    id: 'build',
    title: 'Build something new',
    summary: 'From idea to working software. We work out what’s worth building first, then I build it properly.',
    items: [
      'Websites and web apps',
      'MVPs for new products',
      'Internal tools and dashboards',
      'Mobile apps',
      'APIs, integrations and automations',
    ],
  },
  {
    id: 'ai',
    title: 'Take your AI-built app further',
    summary: 'Built something with Lovable, Replit, Bolt, Cursor or Codex? I’ll help you get it ready for real users.',
    items: [
      'Code and security reviews',
      'Hosting and deployment',
      'Logins and databases',
      'Performance and scaling checks',
      'Harder features',
      'Turning it into a mobile app',
    ],
    notes: [
      'You can keep using your AI tools. I can review your changes, guide you, or take on the tricky bits.',
      'A review finds problems early, but it can’t guarantee an app is fully secure or ready for a set number of users.',
    ],
    featured: true,
  },
  {
    id: 'modernise',
    title: 'Modernise existing software',
    summary: 'Bring older systems up to date without losing the things that already work.',
    items: [
      'Rebuilding dated interfaces',
      'Moving to modern frameworks',
      'Refactoring legacy code',
      'Replacing old integrations',
      'Step-by-step migrations',
    ],
  },
  {
    id: 'guidance',
    title: 'Advice and ongoing support',
    summary: 'Help when you need it, without signing up to a whole project.',
    items: [
      'One-off calls',
      'Code and architecture reviews',
      'Troubleshooting and deployment help',
      'Help using AI coding tools',
      'Regular check-ins, if useful',
    ],
  },
];

/** The "How I work" section. Keep each one to a sentence. */
export const principles = [
  {
    title: 'It stays yours',
    body: 'Code, hosting and accounts sit in your name, and ownership is agreed in writing before we start.',
  },
  {
    title: 'Keep building yourself',
    body: 'If you want to carry on working on it, I’ll help you do that rather than make you rely on me.',
  },
  {
    title: 'No off-the-shelf answers',
    body: 'We start with the problem. Sometimes the best fix is building less.',
  },
  {
    title: 'You talk to me',
    body: 'No account managers and no handovers.',
  },
  {
    title: 'Built to last',
    body: 'I plan for deployment, maintenance and what happens after launch.',
  },
];
