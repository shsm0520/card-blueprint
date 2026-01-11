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

    // Pattern 1: Match Chase credit card product pages
    // Accepts: /cash-back-credit-cards/..., /travel-credit-cards/..., etc.
    // Exclude: full URLs pointing elsewhere, apply/learn pages
    const isCardPage =
      /\/(?:cash-back|travel|business|secured|student)-credit-cards\/[a-z0-9\-]+/i.test(
        href
      );
    const isExternal =
      href.startsWith("http") && !href.includes("creditcards.chase.com");
    const isApplyPage = /application|oao|secure/i.test(href);

    if (!isCardPage || isExternal || isApplyPage) return;

    // Pattern 2: Normalize card name
    const name = text
      .replace(/\s*opens(?:\s+\w+)*\s+in\s+a\s+new\s+window\s*/gi, "")
      .replace(/\s*\[new\]\s*/gi, "")
      .replace(/\s*®\s*/g, "")
      .replace(/\s*†\s*/g, "")
      .replace(/\s*<sup>.*?<\/sup>\s*/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Pattern 3: Real card names are meaningful
    // Minimum 5 chars, doesn't start with numbers, remove extra tokens
    if (!name || name.length < 5 || /^\d/.test(name)) return;
    if (
      name.includes("Links to") ||
      name.includes("Opens") ||
      name.includes("Link")
    )
      return;

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
      "see all",
      "see details",
      "pricing",
    ];
    if (exclusions.some((ex) => lowerName.includes(ex))) return;

    const slug = slugify(name);
    if (seen.has(slug)) return;
    seen.add(slug);

    // Normalize URL - remove query params if we're building absolute URL
    let absoluteHref = href;
    if (!href.startsWith("http")) {
      absoluteHref = `https://creditcards.chase.com${href}`;
    }
    // Remove query params to get clean product URL
    absoluteHref = absoluteHref.split("?")[0];

    cards.push({ name, href: absoluteHref, slug });
  });

  return cards;
}
