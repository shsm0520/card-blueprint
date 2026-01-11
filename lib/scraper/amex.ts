// Amex cards - static data (JavaScript rendering makes scraping unreliable)
const AMEX_BASE = "https://www.americanexpress.com/us/credit-cards";

// Amex cards with known data as of January 2026
const KNOWN_CARDS = [
  // Premium Travel Cards
  {
    name: "Platinum Card",
    path: "/card/platinum-card",
    annualFee: 895,
    rewardType: "Travel Points",
  },
  {
    name: "Gold Card",
    path: "/card/gold-card",
    annualFee: 325,
    rewardType: "Travel Points",
  },
  {
    name: "Green Card",
    path: "/card/green-card",
    annualFee: 150,
    rewardType: "Travel Points",
  },

  // Cash Back Cards
  {
    name: "Blue Cash Preferred Card",
    path: "/card/blue-cash-preferred-credit-card",
    annualFee: 95,
    rewardType: "Cashback",
  },
  {
    name: "Blue Cash Everyday Card",
    path: "/card/blue-cash-everyday-credit-card",
    annualFee: 0,
    rewardType: "Cashback",
  },

  // Delta Co-Branded Cards
  {
    name: "Delta SkyMiles Blue Card",
    path: "/card/delta-skymiles-blue-american-express-card",
    annualFee: 0,
    rewardType: "Miles",
  },
  {
    name: "Delta SkyMiles Gold Card",
    path: "/card/delta-skymiles-gold-american-express-card",
    annualFee: 150,
    rewardType: "Miles",
  },
  {
    name: "Delta SkyMiles Platinum Card",
    path: "/card/delta-skymiles-platinum-american-express-card",
    annualFee: 350,
    rewardType: "Miles",
  },
  {
    name: "Delta SkyMiles Reserve Card",
    path: "/card/delta-skymiles-reserve-american-express-card",
    annualFee: 650,
    rewardType: "Miles",
  },

  // Hilton Co-Branded Cards
  {
    name: "Hilton Honors Card",
    path: "/card/hilton-honors-american-express-card",
    annualFee: 0,
    rewardType: "Hotel Points",
  },
  {
    name: "Hilton Honors Surpass Card",
    path: "/card/hilton-honors-american-express-surpass-card",
    annualFee: 150,
    rewardType: "Hotel Points",
  },
  {
    name: "Hilton Honors Aspire Card",
    path: "/card/hilton-honors-american-express-aspire-card",
    annualFee: 550,
    rewardType: "Hotel Points",
  },

  // Marriott Co-Branded Cards
  {
    name: "Marriott Bonvoy Bevy Card",
    path: "/card/marriott-bonvoy-bevy-american-express-card",
    annualFee: 250,
    rewardType: "Hotel Points",
  },
  {
    name: "Marriott Bonvoy Brilliant Card",
    path: "/card/marriott-bonvoy-brilliant-american-express-card",
    annualFee: 650,
    rewardType: "Hotel Points",
  },

  // Business Cards
  {
    name: "Business Platinum Card",
    path: "/card/business-platinum-card",
    annualFee: 695,
    rewardType: "Travel Points",
  },
  {
    name: "Business Gold Card",
    path: "/card/business-gold-card",
    annualFee: 375,
    rewardType: "Travel Points",
  },
  {
    name: "Blue Business Plus Card",
    path: "/card/blue-business-plus-credit-card",
    annualFee: 0,
    rewardType: "Travel Points",
  },
  {
    name: "Blue Business Cash Card",
    path: "/card/blue-business-cash-card",
    annualFee: 0,
    rewardType: "Cashback",
  },
];

export type ScrapedCard = {
  name: string;
  href: string;
  annualFee?: number;
  rewardType?: string;
  benefits?: string[];
};

/**
 * Get Amex credit cards from static data
 * Note: Amex uses heavy JavaScript rendering which makes reliable scraping difficult
 * This uses a curated list with known card data that should be updated periodically
 */
export async function crawlAmexAllCards(): Promise<ScrapedCard[]> {
  try {
    console.log(`Loading ${KNOWN_CARDS.length} known Amex cards...`);

    const results: ScrapedCard[] = KNOWN_CARDS.map((card) => {
      const fullUrl = card.path.startsWith("http")
        ? card.path
        : `${AMEX_BASE}${card.path}/`;

      return {
        name: card.name,
        href: fullUrl,
        annualFee: card.annualFee,
        rewardType: card.rewardType,
        benefits: undefined, // Could be added manually if needed
      };
    });

    console.log(
      `Successfully loaded ${results.length}/${KNOWN_CARDS.length} Amex cards`
    );

    return results;
  } catch (error) {
    console.error("Amex data error:", error);
    throw error;
  }
}
