/**
 * A simple score for the kind of sales spam and scams that contact forms
 * attract (SEO offers, crypto, "dear website owner" and so on).
 *
 * - 0 matches: normal enquiry
 * - 1 match: still delivered, but the email subject is marked [Possible spam]
 * - 2+ matches: quietly dropped
 *
 * Add phrases here if anything gets through. Keep them specific so real
 * enquiries aren't caught.
 */
const SPAM_PATTERNS: RegExp[] = [
  /\bseo\b/i,
  /\bbacklinks?\b/i,
  /\bguest posts?\b/i,
  /\b(first|1st) page of google\b/i,
  /\brank(ing)? (your|ur) (website|site)\b/i,
  /\b(website|web) traffic\b/i,
  /\blead generation\b/i,
  /\bdigital marketing (agency|services)\b/i,
  /\bwhite[- ]label\b/i,
  /\boutsourc(e|ing) (team|partner|company)\b/i,
  /\b(crypto|bitcoin|forex|binary options|nft)\b/i,
  /\b(casino|betting|viagra|cialis)\b/i,
  /\binvestment opportunit(y|ies)\b/i,
  /\bdear (sir|madam|website owner|business owner)\b/i,
  /\b(hi|hello) (website|business) owner\b/i,
  /\bunsubscribe\b/i,
  /\b(telegram|whatsapp)\s*[:+]?\s*\+?\d/i,
  /\bfiverr|upwork\b/i,
];

export function spamScore(text: string): number {
  return SPAM_PATTERNS.reduce((score, re) => score + (re.test(text) ? 1 : 0), 0);
}

export function linkCount(text: string): number {
  return (text.match(/https?:\/\/\S+|(?<!\/)\bwww\.\S+/gi) ?? []).length;
}
