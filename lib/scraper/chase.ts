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

  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();
    if (!href || !text) return;
    // Heuristic: keep credit-card detail links
    if (!href.includes("/credit-cards/")) return;
    const name = text.replace(/\s+/g, " ").trim();
    if (!name) return;
    const slug = slugify(name);
    if (seen.has(slug)) return;
    seen.add(slug);
    const absoluteHref = href.startsWith("http")
      ? href
      : `https://creditcards.chase.com${
          href.startsWith("/") ? href : `/${href}`
        }`;
    cards.push({ name, href: absoluteHref, slug });
  });

  return cards;
}
