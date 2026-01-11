import { load } from "cheerio";

const TARGET_URL =
  "https://creditcards.chase.com/all-credit-cards?CELL=6PK0&jp_ltg=chsecate_allcards";

export type ScrapedCard = {
  name: string;
  href: string;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function crawlChaseAllCards(): Promise<
  (ScrapedCard & { slug: string })[]
> {
  const res = await fetch(TARGET_URL, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch chase cards page: ${res.status} ${res.statusText}`
    );
  }

  const html = await res.text();
  const $ = load(html);

  const seen = new Set<string>();
  const cards: (ScrapedCard & { slug: string })[] = [];

  $("a").each((index: number, el: any) => {
    const href = $(el).attr("href") || "";
    let text = $(el).text().trim();
    if (!href || !text) return;

    // Pattern 1: Must be a credit card detail page
    // Real cards: /credit-cards/{card-name}/ (single path segment after /credit-cards/)
    // Exclude: /credit-cards/compare, /credit-cards/faq, etc.
    const cardDetailRegex = /^\/credit-cards\/([a-z0-9\-]+)\/?$/i;
    if (!cardDetailRegex.test(href)) return;

    // Pattern 2: Normalize card name
    const name = text
      .replace(/\s*opens(?:\s+\w+)*\s+in\s+a\s+new\s+window\s*/gi, "")
      .replace(/\s*\[new\]\s*/gi, "")
      .replace(/\s*†\s*/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Pattern 3: Real card names are meaningful (not just nav links)
    // Minimum 5 chars, doesn't start with numbers
    if (!name || name.length < 5 || /^\d/.test(name)) return;

    // Pattern 4: Exclude known non-card pages
    const lowerName = name.toLowerCase();
    const exclusions = [
      "compare",
      "faq",
      "glossary",
      "education",
      "journey",
      "agreement",
      "terms",
      "score",
      "rewards",
      "apply",
      "learn",
    ];
    if (exclusions.some((ex) => lowerName.includes(ex))) return;

    const slug = slugify(name);
    if (seen.has(slug)) return;
    seen.add(slug);

    const absoluteHref = `https://creditcards.chase.com${href}`;
    cards.push({ name, href: absoluteHref, slug });
  });

  return cards;
}
