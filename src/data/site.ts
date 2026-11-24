/**
 * Site-wide details. Edit these to update your name, location, links and
 * navigation everywhere on the site.
 */
export const site = {
  name: 'Kieran Riley',
  shortName: 'Kieran',
  role: 'Full-stack software developer',
  location: 'Newcastle, UK',
  locality: 'Newcastle upon Tyne',
  country: 'GB',
  // Shown on the site as the place to get in touch. The enquiry form is the
  // main route, so this can stay null until you have a public contact address.
  publicEmail: null as string | null,
  // Address people can use for privacy requests (shown on the privacy page).
  // TODO before launch: set this to a real address you check.
  privacyEmail: null as string | null,
  // How long enquiries are kept if they don't lead to a project. Review this.
  enquiryRetention: '12 months',
  responseTime: 'two working days',
  // Optional: paste the content value of Google Search Console's HTML tag
  // verification here. (Verifying with a DNS record works too and needs no change.)
  googleSiteVerification: null as string | null,
  defaultDescription:
    'Kieran Riley is a freelance full-stack software developer in Newcastle, UK. I help people build, fix and launch software, including apps started with AI tools like Lovable, Replit and Cursor.',
  social: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/kieran-riley-b76283166/', icon: 'linkedin' },
    { label: 'GitHub', href: 'https://github.com/kieran-riley', icon: 'github' },
    { label: 'Instagram', href: 'https://www.instagram.com/kieran.riley_/', icon: 'instagram' },
  ],
  agentsNe: { label: 'agentsdotne.uk', href: 'https://agentsdotne.uk' },
  nav: [
    { label: 'About', href: '/' },
    { label: 'Work with me', href: '/work-with-me' },
  ],
} as const;

export type SocialIcon = (typeof site.social)[number]['icon'];
