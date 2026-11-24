/**
 * The four services shown on the Work With Me page. Edit the copy here and the
 * page updates automatically. `id` is used for the in-page anchor links, so keep
 * it short and URL-friendly.
 */
export interface Service {
  id: string;
  number: string;
  title: string;
  tagline: string;
  intro: string[];
  examplesHeading: string;
  examples: string[];
  note?: string;
  featured?: boolean;
}

export const services: Service[] = [
  {
    id: 'build',
    number: '01',
    title: 'Build something new',
    tagline: 'From idea to working software.',
    intro: [
      'Whether it’s a product idea you’ve been thinking about for months or a tool your business needs to run more smoothly, I can help you design, build and launch it.',
      'We start by getting clear on the problem you’re solving and who it’s for. From there, I’ll plan a practical first version, build it properly and make sure it’s something you can keep running and improving — not a one-off that’s hard to change later.',
    ],
    examplesHeading: 'Things I can help build',
    examples: [
      'Websites and web applications',
      'Custom business software',
      'Internal tools and dashboards',
      'MVPs and startup products',
      'Mobile applications',
      'Integrations and automations',
      'Backend systems and APIs',
    ],
  },
  {
    id: 'ai',
    number: '02',
    title: 'Take your AI-built application further',
    tagline: 'Built something with AI? Let’s take it to the next level.',
    intro: [
      'Tools like Lovable, Replit, Bolt, Cursor and Codex make it possible to get a long way on your own. Then you hit the questions that are harder to prompt your way through: Is this secure? Will it cope with real users? How do I deploy it properly? Why does fixing one thing keep breaking another?',
      'That’s where I come in. I’ll look at what you’ve built, explain what’s working and what needs attention, and help you get it ready for real people to use.',
      'You don’t have to stop using your AI tools. I can work alongside you — guiding you, reviewing your changes, or taking on the trickier pieces of work we agree on — so you stay in control of your project.',
    ],
    examplesHeading: 'How I can help',
    examples: [
      'Reviewing AI-generated code',
      'Identifying security risks',
      'Improving architecture and maintainability',
      'Configuring hosting and deployment',
      'Implementing authentication and databases',
      'Reviewing scalability and performance',
      'Preparing prototypes for real users',
      'Adding more complex functionality',
      'Turning web apps into mobile apps with React Native',
    ],
    note: 'A code review is a great way to find problems early, but no review can guarantee an application is completely secure or able to handle a particular number of users. If you need that level of confidence, we can talk about properly scoped testing.',
    featured: true,
  },
  {
    id: 'modernise',
    number: '03',
    title: 'Modernise existing software',
    tagline: 'Bring your existing software up to date.',
    intro: [
      'Older systems often hold years of business knowledge — and plenty of quirks. I’ll take the time to understand how your software is actually used before suggesting changes, so the things that matter keep working.',
      'Modernising doesn’t have to mean starting again from scratch. Sometimes the right move is a rebuild; often it’s a series of careful, phased improvements.',
    ],
    examplesHeading: 'Typical work',
    examples: [
      'Modernising older web applications',
      'Rebuilding outdated interfaces',
      'Migrating to modern frameworks',
      'Improving usability and performance',
      'Refactoring legacy code',
      'Replacing outdated integrations',
      'Improving maintainability',
      'Planning phased migrations',
    ],
  },
  {
    id: 'guidance',
    number: '04',
    title: 'Technical guidance and ongoing support',
    tagline: 'Expert help, whenever you need it.',
    intro: [
      'Not every problem needs a full development project. Sometimes you just need an experienced developer to talk something through, take a look at your code or help you get unstuck.',
      'You can book time as and when you need it. If regular check-ins or ongoing support would be useful, we can talk about what that might look like after an initial conversation.',
    ],
    examplesHeading: 'Ways I can support you',
    examples: [
      'One-off technical consultations',
      'Code reviews',
      'Architecture reviews',
      'Development troubleshooting',
      'Deployment assistance',
      'Technical planning',
      'Product development advice',
      'Optional recurring reviews',
      'Maintenance and improvements',
      'Guidance using AI coding agents',
    ],
  },
];

/** The principles shown in the "How I work" section. */
export const principles = [
  {
    title: 'Your project stays yours',
    body: 'Wherever it makes sense, your project lives in your own code repository, hosting account and third-party services — not mine. Who owns the work and intellectual property is set out clearly in our agreement before we start.',
  },
  {
    title: 'Build independently, with support when you need it',
    body: 'If you want to keep developing your software yourself, I’ll help you do that. I can set up your development workflow, review your changes and step in for the more complicated tasks. The aim is to help you do more, not depend on me.',
  },
  {
    title: 'No cookie-cutter solutions',
    body: 'Every project starts with understanding the problem. The best answer might be something new, an improvement to what you already have, an AI tool, a simpler set of requirements — or a different approach entirely.',
  },
  {
    title: 'Direct, personal communication',
    body: 'You deal with me. No account managers, no handovers and no complicated agency processes — just straightforward conversations with the person doing the work.',
  },
  {
    title: 'Thinking beyond launch',
    body: 'Launching is only the start. I think about how your software will be deployed, maintained and improved as your needs change, so it keeps working for you long after day one.',
  },
];
