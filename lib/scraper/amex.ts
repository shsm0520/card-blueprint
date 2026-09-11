// Amex cards - using official API
const AMEX_API_URL =
  "https://daconsumershop.americanexpress.com/us/cardshop-api/api/v1/cps/content/vac/pageType/25330/?inav=us_menu_cards_personal_cards_view_all_credit_cards&currentUrl=www.americanexpress.com%2Fus%2Fcredit-cards%2F";
const AMEX_BASE = "https://www.americanexpress.com/us/credit-cards";

export type ScrapedCard = {
  name: string;
  slug: string;
  href: string;
  annualFee?: number;
  rewardType?: string;
  benefits?: string[];
  introOffer?: string;
  cardType?: "personal" | "business";
};

interface AmexApiCard {
  cardTitle: string;
  productName: string;
  fee?: {
    header: string;
    text: string;
  };
  filters?: string[];
  welcomeOffer?: {
    header: string;
    text: string;
  };
  keyProductFeatures?: {
    features?: Array<{
      header: string;
      description: string;
    }>;
  };
  applyNowLink?: {
    url: string;
  };
}

interface AmexApiResponse {
  cards: AmexApiCard[];
}

/**
 * Parse annual fee from Amex API text
 * Returns both regular fee and intro offer info
 */
function parseAnnualFee(feeText: string): { fee: number; introOffer?: string } {
  if (!feeText) return { fee: 0 };

  const cleanText = cleanHtmlText(feeText);

  // Handle "No Annual Fee" (without any dollar amount)
  if (cleanText.includes("No Annual Fee") && !cleanText.match(/\$\d+/)) {
    return { fee: 0 };
  }

  // Handle intro offers: "$0 intro... then $95" pattern
  const introMatch = cleanText.match(/\$0.*?intro.*?then\s+\$(\d+)/i);
  if (introMatch) {
    return {
      fee: parseInt(introMatch[1], 10),
      introOffer: "First year free",
    };
  }

  // Handle "then $95" pattern
  const thenMatch = cleanText.match(/then\s+\$(\d+)/i);
  if (thenMatch) {
    return { fee: parseInt(thenMatch[1], 10) };
  }

  // Extract any dollar amount (e.g., "$895", "$95")
  const match = cleanText.match(/\$(\d+)/);
  if (match) {
    return { fee: parseInt(match[1], 10) };
  }

  return { fee: 0 };
}

/**
 * Determine reward type based on card filters and features
 */
function determineRewardType(card: AmexApiCard): string {
  const filters = card.filters || [];

  if (filters.includes("cash-back")) {
    return "Cashback";
  }
  if (
    filters.includes("airline-miles") ||
    filters.includes("airline-rewards")
  ) {
    return "Miles";
  }
  if (filters.includes("hotel-rewards")) {
    return "Hotel Points";
  }
  if (filters.includes("travel-rewards") || filters.includes("reward-points")) {
    return "Travel Points";
  }

  return "Points";
}

/**
 * Clean HTML entities and tags from text
 */
function cleanHtmlText(text: string): string {
  if (!text) return "";

  return (
    text
      // Remove HTML tags
      .replace(/<[^>]*>/g, "")
      // Decode common HTML entities
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&reg;/gi, "")
      .replace(/&trade;/gi, "")
      // Remove numeric HTML entities
      .replace(/&#\d+;/g, "")
      // Remove hex HTML entities
      .replace(/&#x[0-9A-Fa-f]+;/g, "")
      // Remove registration / trademark symbols
      .replace(/[®™‡]/g, "")
      // Clean up multiple spaces
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Maps Amex card name / product name to canonical slug
 */
export function getCanonicalAmexSlug(cardName: string, productName?: string): string {
  const normalized = cleanHtmlText(cardName).toLowerCase();

  if (normalized.includes("platinum") && !normalized.includes("delta") && !normalized.includes("business")) {
    return "amex-platinum";
  }
  if (normalized.includes("gold") && !normalized.includes("delta") && !normalized.includes("business")) {
    return "amex-gold";
  }
  if (normalized.includes("blue cash preferred")) {
    return "amex-blue-cash-preferred";
  }
  if (normalized.includes("blue cash everyday")) {
    return "amex-blue-cash-everyday";
  }

  // Fallback for other Amex cards
  const cleanName = normalized
    .replace(/^american express\s*/i, "")
    .replace(/\s*american express\s*/i, " ")
    .replace(/\s*card\s*/i, "")
    .trim();

  const slugBody = cleanName
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `amex-${slugBody}`;
}

/**
 * Extract key benefits from card features
 */
function extractBenefits(card: AmexApiCard): string[] {
  const benefits: string[] = [];

  if (card.welcomeOffer?.header) {
    benefits.push(cleanHtmlText(card.welcomeOffer.header));
  }

  if (card.keyProductFeatures?.features) {
    card.keyProductFeatures.features.slice(0, 3).forEach((feature) => {
      if (feature.header) {
        benefits.push(cleanHtmlText(feature.header));
      }
    });
  }

  return benefits;
}

/**
 * Get Amex credit cards from official API
 */
export async function crawlAmexAllCards(): Promise<ScrapedCard[]> {
  try {
    console.log("Fetching Amex cards from official API...");

    const response = await fetch(AMEX_API_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data: AmexApiResponse = await response.json();

    if (!data.cards || !Array.isArray(data.cards)) {
      throw new Error("Invalid API response format");
    }

    console.log(`Found ${data.cards.length} cards from Amex API`);

    const results: ScrapedCard[] = data.cards
      .filter((card) => card.cardTitle && card.productName)
      .map((card) => {
        // Build card URL
        const cardUrl =
          card.applyNowLink?.url || `${AMEX_BASE}/card/${card.productName}/`;

        // Parse annual fee
        const feeInfo = parseAnnualFee(card.fee?.text || "");

        const cleanName = cleanHtmlText(card.cardTitle);
        const isBusiness = /business/i.test(cleanName) || /business/i.test(card.productName || "");

        return {
          name: cleanName,
          slug: getCanonicalAmexSlug(cleanName, card.productName),
          href: cardUrl,
          annualFee: feeInfo.fee,
          rewardType: determineRewardType(card),
          benefits: extractBenefits(card),
          introOffer: feeInfo.introOffer,
          cardType: isBusiness ? "business" : "personal",
        };
      });

    console.log(`Successfully processed ${results.length} Amex cards`);

    return results;
  } catch (error) {
    console.error("Amex API error:", error);
    throw error;
  }
}
