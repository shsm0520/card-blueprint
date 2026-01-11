import { load } from "cheerio";

const TARGET_URL =
  "https://creditcards.chase.com/all-credit-cards?CELL=6PK0&jp_ltg=chsecate_allcards";

export type ScrapedCard = {
  name: string;
  href: string;
  annualFee?: number;
  rewardType?: string;
  benefits?: string[];
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function extractCardDetails(
  cardHref: string,
  cardName: string
): Promise<{
  annualFee?: number;
  rewardType?: string;
  benefits?: string[];
}> {
  try {
    const res = await fetch(cardHref, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });

    if (!res.ok) return {};

    const html = await res.text();
    const $ = load(html);

    // Extract Annual Fee as number
    let annualFee: number | undefined;

    // Look for "ANNUAL FEE" heading and get the next content
    $("*").each((i, el) => {
      const text = $(el).text().trim();
      if (text === "ANNUAL FEE" || /^annual\s+fee$/i.test(text)) {
        const feeSection = $(el).parent().text();
        const match = feeSection.match(/\$(\d+)|no\s+annual\s+fee/i);
        if (match) {
          if (match[1]) {
            annualFee = parseInt(match[1], 10);
          } else if (/no\s+annual\s+fee/i.test(match[0])) {
            annualFee = 0;
          }
        }
      }
    });

    // Extract Reward Type from URL path - simplified to major categories
    let rewardType = "Points"; // default

    // Extract URL segments: /category/brand/product
    const urlMatch = cardHref.match(
      /(?:cash-back|travel|business|secured|student)-credit-cards\/([a-z0-9\-]+)/i
    );
    const category = urlMatch?.[0]?.split("/")?.[0]?.toLowerCase();
    const brand = urlMatch?.[1]?.toLowerCase();

    if (category === "cash-back-credit-cards") {
      rewardType = "Cashback";
    } else if (category === "travel-credit-cards") {
      // Check for hotel cards first
      if (
        /hyatt|ihg|marriott|bonvoy|hotel/i.test(brand ?? "") ||
        /hyatt|ihg|marriott|bonvoy|hotel/i.test(cardName)
      ) {
        rewardType = "Hotel Points";
      } else if (
        /southwest|united|aeroplan|avios|aircanada|british|iberia/i.test(
          brand ?? ""
        )
      ) {
        rewardType = "Miles";
      } else {
        rewardType = "Travel Points"; // Sapphire, Freedom = UR points
      }
    } else if (category === "business-credit-cards") {
      rewardType = "Business";
    } else if (category === "secured-credit-cards") {
      rewardType = "Secured";
    }
    // } else if (category === "student-credit-cards") {
    //   rewardType = "Student";
    // }

    // Note: Benefits extraction disabled due to unreliable web scraping
    // (picks up navigation/menu text instead of actual card benefits)
    // TODO: Implement more reliable benefit extraction or use manual curation

    return {
      annualFee,
      rewardType,
      benefits: undefined, // Disabled for now
    };
  } catch (error) {
    console.error(`Error extracting details from ${cardHref}:`, error);
    return {};
  }
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

    if (!href) return;

    // Pattern 1: Only match individual product pages
    // /cash-back-credit-cards/{name}/{product} or /travel-credit-cards/{name}/{product}
    // This ensures we skip category pages like /cash-back-credit-cards/freedom (brands page)
    const isIndividualCard =
      /(?:cash-back|travel|business|secured|student)-credit-cards\/[a-z0-9\-]+\/[a-z0-9\-]+/i.test(
        href
      );

    if (!isIndividualCard) return;

    // Pattern 2: Skip external and apply pages
    const isExternal =
      href.startsWith("http") && !href.includes("creditcards.chase.com");
    const isApplyPage = /application|oao|secure\.chase/i.test(href);

    if (isExternal || isApplyPage) return;

    // Pattern 3: Extract text and clean it
    let text = $(el).text().trim();

    // Normalize whitespace first
    text = text.replace(/\n[\s\n]*/g, " ").replace(/\s+/g, " ");

    // Skip if starts with "See details" (these are secondary click targets)
    if (/^see details/i.test(text)) return;

    // Extract card name - split on (number) count or action keywords
    const cardNameMatch = text
      .split(/\s*\(\d+\)|links?\s+to|opens|see details/i)[0]
      .trim();
    text = cardNameMatch;

    // Clean up special characters
    text = text.replace(/\s*®\s*/g, "®").trim();

    if (!text || text.length < 3) return;

    // Pattern 4: Exclude category/brand pages
    if (/\(\d+\)|brands?\s+page|category\s+page/i.test(text)) return;

    // Pattern 5: Real product pages must contain "credit card"
    if (!/credit\s+card/i.test(text)) return;

    const slug = slugify(text);
    if (seen.has(slug)) return;
    seen.add(slug);

    // Normalize URL
    let absoluteHref = href;
    if (!href.startsWith("http")) {
      absoluteHref = `https://creditcards.chase.com${href}`;
    }
    absoluteHref = absoluteHref.split("?")[0];

    cards.push({ name: text, href: absoluteHref, slug });
  });

  // Fetch detail information for each card
  const cardsWithDetails = await Promise.all(
    cards.map(async (card) => {
      const details = await extractCardDetails(card.href, card.name);
      return {
        ...card,
        annualFee: details.annualFee,
        rewardType: details.rewardType,
        benefits: details.benefits,
      };
    })
  );

  return cardsWithDetails;
}
