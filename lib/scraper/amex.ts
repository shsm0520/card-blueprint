// Amex cards - using official API
const AMEX_API_URL =
  "https://daconsumershop.americanexpress.com/us/cardshop-api/api/v1/cps/content/vac/pageType/25330/?inav=us_menu_cards_personal_cards_view_all_credit_cards&currentUrl=www.americanexpress.com%2Fus%2Fcredit-cards%2F";
const AMEX_BASE = "https://www.americanexpress.com/us/credit-cards";

export type ScrapedCard = {
  name: string;
  href: string;
  annualFee?: number;
  rewardType?: string;
  benefits?: string[];
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
 */
function parseAnnualFee(feeText: string): number {
  if (!feeText) return 0;

  // Handle "No Annual Fee" or "$0"
  if (feeText.includes("No Annual Fee") || feeText.includes("$0")) {
    return 0;
  }

  // Extract first dollar amount (e.g., "$895", "$95", "$0 intro annual fee for the first year, then $95")
  const match = feeText.match(/\$(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return 0;
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
  
  return text
    // Remove HTML tags
    .replace(/<[^>]*>/g, "")
    // Decode common HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Remove numeric HTML entities (like &#8482;, &#174;, &#8225;)
    .replace(/&#\d+;/g, "")
    // Remove hex HTML entities (like &#xFE0E;)
    .replace(/&#x[0-9A-Fa-f]+;/g, "")
    // Clean up multiple spaces
    .replace(/\s+/g, " ")
    .trim();
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

    if (!responseleanHtmlText(card.cardTitle
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
        const annualFee = parseAnnualFee(card.fee?.text || "");

        return {
          name: card.cardTitle.replace(/<[^>]*>/g, "").trim(),
          href: cardUrl,
          annualFee,
          rewardType: determineRewardType(card),
          benefits: extractBenefits(card),
        };
      });

    console.log(`Successfully processed ${results.length} Amex cards`);

    return results;
  } catch (error) {
    console.error("Amex API error:", error);
    throw error;
  }
}
