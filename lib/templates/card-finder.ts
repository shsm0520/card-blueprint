/**
 * Dynamic card finder - finds cards from DB by patterns instead of hardcoded slugs
 */

import { prisma } from "@/lib/prisma";

interface CardSearchCriteria {
  issuer: string;
  namePattern: string; // Regex-friendly pattern
  cardType?: "personal" | "business";
  excludePattern?: string; // Exclude cards matching this pattern
  tags?: string[]; // Must have at least one of these tags
}

const CARD_PATTERNS: Record<string, CardSearchCriteria> = {
  // Chase cards
  "chase-freedom-unlimited": {
    issuer: "Chase",
    namePattern: "Freedom Unlimited",
    cardType: "personal",
  },
  "chase-freedom-flex": {
    issuer: "Chase",
    namePattern: "Freedom Flex",
    cardType: "personal",
  },
  "chase-sapphire-preferred": {
    issuer: "Chase",
    namePattern: "Sapphire.*Preferred",
    cardType: "personal",
    excludePattern: "Business|Reserve",
  },
  "chase-sapphire-reserve": {
    issuer: "Chase",
    namePattern: "Sapphire.*Reserve",
    cardType: "personal",
    excludePattern: "Business",
  },
  "chase-ink-business-preferred": {
    issuer: "Chase",
    namePattern: "Ink.*Preferred",
    cardType: "business",
  },

  // Amex cards
  "amex-platinum": {
    issuer: "American Express",
    namePattern: "Platinum",
    cardType: "personal",
    excludePattern: "Business|Delta",
  },
  "amex-gold": {
    issuer: "American Express",
    namePattern: "Gold",
    cardType: "personal",
    excludePattern: "Business",
  },
  "amex-blue-cash-preferred": {
    issuer: "American Express",
    namePattern: "Blue Cash Preferred",
    cardType: "personal",
  },
  "amex-blue-cash-everyday": {
    issuer: "American Express",
    namePattern: "Blue Cash Everyday",
    cardType: "personal",
  },

  // Citi cards
  "citi-double-cash": {
    issuer: "Citi",
    namePattern: "Double Cash",
    cardType: "personal",
  },
  "citi-custom-cash": {
    issuer: "Citi",
    namePattern: "Custom Cash",
    cardType: "personal",
  },

  // Capital One cards
  "capital-one-venture": {
    issuer: "Capital One",
    namePattern: "Venture",
    cardType: "personal",
    excludePattern: "Venture X",
  },
  "capital-one-venture-x": {
    issuer: "Capital One",
    namePattern: "Venture X",
    cardType: "personal",
  },
  "capital-one-savor-one": {
    issuer: "Capital One",
    namePattern: "SavorOne",
    cardType: "personal",
  },
};

/**
 * Issuer aliases to handle different naming conventions
 * (e.g., "Amex" vs "American Express")
 */
const ISSUER_ALIASES: Record<string, string[]> = {
  "American Express": ["amex", "americanexpress", "american express"],
  "Capital One": ["capitalone", "capital one"],
  "Chase": ["chase"],
  "Citi": ["citi", "citibank"],
};

/**
 * Check if two issuers match, accounting for aliases
 */
function issuersMatch(issuer1: string, issuer2: string): boolean {
  const normalized1 = issuer1.toLowerCase().replace(/\s+/g, "");
  const normalized2 = issuer2.toLowerCase().replace(/\s+/g, "");

  // Direct match
  if (normalized1 === normalized2) return true;

  // Check if both resolve to the same canonical issuer
  for (const [canonical, aliases] of Object.entries(ISSUER_ALIASES)) {
    const normalized1Matches = aliases.some((alias) =>
      alias.replace(/\s+/g, "") === normalized1
    );
    const normalized2Matches = aliases.some((alias) =>
      alias.replace(/\s+/g, "") === normalized2
    );

    if (normalized1Matches && normalized2Matches) {
      return true;
    }
  }

  return false;
}

/**
 * Cache for card lookups to avoid repeated DB queries
 */
let cardCache: Map<string, string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Find a card slug by its logical key (e.g., "chase-freedom-unlimited")
 * Returns the actual slug from the database or null if not found
 */
export async function findCardSlug(logicalKey: string): Promise<string | null> {
  // Check cache first
  if (cardCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cardCache.get(logicalKey) || null;
  }

  // Build cache
  await buildCardCache();
  return cardCache!.get(logicalKey) || null;
}

/**
 * Build the card cache by querying all active cards once
 */
async function buildCardCache(): Promise<void> {
  const cards = await prisma.card.findMany({
    where: { isActive: true },
    select: { slug: true, name: true, issuer: true, cardType: true },
  });

  cardCache = new Map();

  // Match each logical key to actual card slug
  for (const [logicalKey, criteria] of Object.entries(CARD_PATTERNS)) {
    const matchedCard = cards.find((card) => {
      // Check issuer using alias-aware matching
      if (!issuersMatch(card.issuer, criteria.issuer)) {
        return false;
      }

      // Check card type if specified
      if (criteria.cardType && card.cardType !== criteria.cardType) return false;

      // Check name pattern
      const nameRegex = new RegExp(criteria.namePattern, "i");
      if (!nameRegex.test(card.name)) return false;

      // Check exclude pattern
      if (criteria.excludePattern) {
        const excludeRegex = new RegExp(criteria.excludePattern, "i");
        if (excludeRegex.test(card.name)) return false;
      }

      return true;
    });

    if (matchedCard) {
      cardCache.set(logicalKey, matchedCard.slug);
    }
  }

  cacheTimestamp = Date.now();
}

/**
 * Resolve multiple logical keys to actual slugs
 * Returns a map of logicalKey -> actualSlug (only for found cards)
 */
export async function findCardSlugs(
  logicalKeys: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  for (const key of logicalKeys) {
    const slug = await findCardSlug(key);
    if (slug) {
      result.set(key, slug);
    }
  }

  return result;
}

/**
 * Get fallback card for a given category when primary card is not found
 */
export async function findFallbackCard(
  criteria: Partial<CardSearchCriteria>
): Promise<string | null> {
  const cards = await prisma.card.findMany({
    where: {
      isActive: true,
      issuer: criteria.issuer,
      cardType: criteria.cardType,
    },
    select: { slug: true },
    take: 1,
  });

  return cards.length > 0 ? cards[0].slug : null;
}

/**
 * Clear the card cache (useful for testing or when cards are updated)
 */
export function clearCardCache(): void {
  cardCache = null;
  cacheTimestamp = 0;
}
