/**
 * Tree template generation based on user inputs
 * Provides starter card recommendations based on:
 * - Chase 5/24 status
 * - Credit profile (thin/1-3yr/3+yr)
 * - Goal (cashback/airline/hotel/status)
 */

import { prisma } from "@/lib/prisma";
import { findCardSlug } from "./card-finder";

export interface TemplateInput {
  chase524Status: "under" | "over" | "unknown";
  creditProfile: "thin" | "1to3" | "3plus";
  goal: "cashback" | "airline" | "hotel" | "status";
}

export interface TemplateNode {
  cardSlug: string;
  parentCardSlug?: string; // undefined = root node
  position: number;
  note?: string;
  monthsAfterPrevious?: number;
}

/**
 * Generate a starter template based on user profile
 */
export async function generateTemplate(
  input: TemplateInput
): Promise<TemplateNode[]> {
  const { chase524Status, creditProfile, goal } = input;

  // Thin file users should start with no-annual-fee cards
  if (creditProfile === "thin") {
    return getThinFileTemplate(goal);
  }

  // Under 5/24: Prioritize Chase cards
  if (chase524Status === "under") {
    return getUnder524Template(creditProfile, goal);
  }

  // Over 5/24 or unknown: Focus on Amex, Citi, Capital One
  return getOver524Template(creditProfile, goal);
}

/**
 * Template for users with thin credit file (0-12 months)
 * Start with beginner-friendly cards
 */
async function getThinFileTemplate(goal: string): Promise<TemplateNode[]> {
  const template: TemplateNode[] = [];

  // Step 1: Build credit with no-annual-fee card
  const freedomUnlimited = await findCardSlug("chase-freedom-unlimited");
  if (freedomUnlimited) {
    template.push({
      cardSlug: freedomUnlimited,
      position: 0,
      note: "Start here: Build credit history with no annual fee",
    });
  }

  // Step 2: Add another no-fee card after 3 months (credit score recovery period)
  const freedomFlex = await findCardSlug("chase-freedom-flex");
  if (freedomFlex && freedomUnlimited) {
    template.push({
      cardSlug: freedomFlex,
      parentCardSlug: freedomUnlimited,
      position: 1,
      note: "Wait 3 months for credit score recovery (avg -12 pts → ±0)",
      monthsAfterPrevious: 3,
    });
  }

  // Step 3: First premium card based on goal after another 3 months
  const parentSlug = freedomFlex || freedomUnlimited;
  if (parentSlug) {
    if (goal === "cashback") {
      const blueCashPreferred = await findCardSlug("amex-blue-cash-preferred");
      if (blueCashPreferred) {
        template.push({
          cardSlug: blueCashPreferred,
          parentCardSlug: parentSlug,
          position: 2,
          note: "First annual fee card after 3 months recovery",
          monthsAfterPrevious: 3,
        });
      }
    } else {
      // Try Chase Sapphire Preferred first, fallback to Amex Gold
      let premiumCard = await findCardSlug("chase-sapphire-preferred");
      let premiumNote = "Start earning transferable points after 3 months";

      if (!premiumCard) {
        premiumCard = await findCardSlug("amex-gold");
        premiumNote = "Start earning Amex points for travel after 3 months";
      }

      if (premiumCard) {
        template.push({
          cardSlug: premiumCard,
          parentCardSlug: parentSlug,
          position: 2,
          note: premiumNote,
          monthsAfterPrevious: 3,
        });
      }
    }
  }

  return template;
}

/**
 * Template for under 5/24 users
 * Maximize Chase cards before hitting 5/24
 */
async function getUnder524Template(
  creditProfile: string,
  goal: string
): Promise<TemplateNode[]> {
  const template: TemplateNode[] = [];

  // Starting card based on goal
  if (goal === "cashback") {
    // Cashback strategy
    const freedomUnlimited = await findCardSlug("chase-freedom-unlimited");
    if (freedomUnlimited) {
      template.push({
        cardSlug: freedomUnlimited,
        position: 0,
        note: "Foundation: 1.5% cashback on everything",
      });

      const freedomFlex = await findCardSlug("chase-freedom-flex");
      if (freedomFlex) {
        template.push({
          cardSlug: freedomFlex,
          parentCardSlug: freedomUnlimited,
          position: 1,
          note: "5% rotating categories - Wait 3 months for recovery",
          monthsAfterPrevious: 3,
        });
      }

      if (creditProfile === "3plus") {
        const sapphirePreferred = await findCardSlug("chase-sapphire-preferred");
        if (sapphirePreferred) {
          template.push({
            cardSlug: sapphirePreferred,
            parentCardSlug: freedomFlex || freedomUnlimited,
            position: 2,
            note: "Convert cashback to travel points (optional) - 3 months",
            monthsAfterPrevious: 3,
          });
        }
      }
    }
  } else {
    // Travel strategy (airline/hotel/status)
    // Try Chase Sapphire Preferred, fallback to Amex Gold
    let foundationCard = await findCardSlug("chase-sapphire-preferred");
    let foundationNote = "Foundation: Chase Ultimate Rewards ecosystem";

    if (!foundationCard) {
      foundationCard = await findCardSlug("amex-gold");
      foundationNote = "Foundation: Earn Amex points for travel";
    }

    if (foundationCard) {
      template.push({
        cardSlug: foundationCard,
        position: 0,
        note: foundationNote,
      });

      const freedomUnlimited = await findCardSlug("chase-freedom-unlimited");
      if (freedomUnlimited) {
        template.push({
          cardSlug: freedomUnlimited,
          parentCardSlug: foundationCard,
          position: 1,
          note: "Earn more points on everyday spending - 3 months recovery",
          monthsAfterPrevious: 3,
        });
      }

      const inkPreferred = await findCardSlug("chase-ink-business-preferred");
      if (inkPreferred) {
        template.push({
          cardSlug: inkPreferred,
          parentCardSlug: foundationCard,
          position: 2,
          note: "Business card: Doesn't count toward 5/24 - 3 months",
          monthsAfterPrevious: 3,
        });
      }

      if (creditProfile === "3plus") {
        // Try Chase Sapphire Reserve, fallback to Amex Platinum
        let premiumCard = await findCardSlug("chase-sapphire-reserve");
        let premiumNote = "Premium travel benefits - 3 months recovery";

        if (!premiumCard) {
          premiumCard = await findCardSlug("amex-platinum");
          premiumNote = "Premium: Lounge access and travel benefits - 3 months";
        }

        if (premiumCard) {
          template.push({
            cardSlug: premiumCard,
            parentCardSlug: inkPreferred || foundationCard,
            position: 3,
            note: premiumNote,
            monthsAfterPrevious: 3,
          });
        }
      }
    }
  }

  return template;
}

/**
 * Template for over 5/24 users
 * Focus on Amex, Citi, Capital One
 */
async function getOver524Template(
  creditProfile: string,
  goal: string
): Promise<TemplateNode[]> {
  const template: TemplateNode[] = [];

  if (goal === "cashback") {
    // Cashback strategy without Chase
    // Try Citi first, fallback to Chase if not available
    let foundationCard = await findCardSlug("citi-double-cash");
    let foundationNote = "Foundation: 2% on everything, no annual fee";

    if (!foundationCard) {
      // Fallback to Chase Freedom Unlimited
      foundationCard = await findCardSlug("chase-freedom-unlimited");
      foundationNote = "Foundation: 1.5% cashback on everything, no annual fee";
    }

    if (foundationCard) {
      template.push({
        cardSlug: foundationCard,
        position: 0,
        note: foundationNote,
      });

      // Try to add rotating category card
      let rotatingCard = await findCardSlug("citi-custom-cash");
      let rotatingNote = "5% on top spending category - 3 months recovery";

      if (!rotatingCard) {
        rotatingCard = await findCardSlug("chase-freedom-flex");
        rotatingNote = "5% rotating categories - 3 months recovery";
      }

      if (rotatingCard) {
        template.push({
          cardSlug: rotatingCard,
          parentCardSlug: foundationCard,
          position: 1,
          note: rotatingNote,
          monthsAfterPrevious: 3,
        });
      }

      const blueCashPreferred = await findCardSlug("amex-blue-cash-preferred");
      if (blueCashPreferred) {
        template.push({
          cardSlug: blueCashPreferred,
          parentCardSlug: rotatingCard || foundationCard,
          position: 2,
          note: "6% on groceries, 3% on gas - 3 months",
          monthsAfterPrevious: 3,
        });
      }
    }
  } else if (goal === "airline") {
    // Airline strategy
    const amexPlatinum = await findCardSlug("amex-platinum");
    if (amexPlatinum) {
      template.push({
        cardSlug: amexPlatinum,
        position: 0,
        note: "Premium: 5x on flights, lounge access",
      });

      const amexGold = await findCardSlug("amex-gold");
      if (amexGold) {
        template.push({
          cardSlug: amexGold,
          parentCardSlug: amexPlatinum,
          position: 1,
          note: "4x on dining, earn MR for flights - 3 months recovery",
          monthsAfterPrevious: 3,
        });
      }

      // Try Capital One Venture X, fallback to Chase Sapphire Reserve
      let thirdCard = await findCardSlug("capital-one-venture-x");
      let thirdNote = "Alternative: Simple redemption, lounge access - 3 months";

      if (!thirdCard) {
        thirdCard = await findCardSlug("chase-sapphire-reserve");
        thirdNote = "Alternative: Chase travel benefits, lounge access - 3 months";
      }

      if (thirdCard) {
        template.push({
          cardSlug: thirdCard,
          parentCardSlug: amexGold || amexPlatinum,
          position: 2,
          note: thirdNote,
          monthsAfterPrevious: 3,
        });
      }
    }
  } else {
    // Hotel/Status strategy
    const amexPlatinum = await findCardSlug("amex-platinum");
    if (amexPlatinum) {
      template.push({
        cardSlug: amexPlatinum,
        position: 0,
        note: "Foundation: Hotel status benefits",
      });

      // Try Capital One Venture X, fallback to Chase Sapphire Reserve
      let secondCard = await findCardSlug("capital-one-venture-x");
      let secondNote = "Flexible points for hotel bookings - 3 months recovery";

      if (!secondCard) {
        secondCard = await findCardSlug("chase-sapphire-reserve");
        secondNote = "Chase travel points for hotels - 3 months recovery";
      }

      if (secondCard) {
        template.push({
          cardSlug: secondCard,
          parentCardSlug: amexPlatinum,
          position: 1,
          note: secondNote,
          monthsAfterPrevious: 3,
        });
      }
    }
  }

  return template;
}

/**
 * Validate that all cards in template exist in database
 */
export async function validateTemplate(
  nodes: TemplateNode[]
): Promise<boolean> {
  const slugs = nodes.map((n) => n.cardSlug);
  const cards = await prisma.card.findMany({
    where: { slug: { in: slugs }, isActive: true },
    select: { slug: true },
  });

  const foundSlugs = new Set(cards.map((c) => c.slug));
  return slugs.every((slug) => foundSlugs.has(slug));
}

/**
 * Get card IDs from slugs for creating nodes
 */
export async function resolveCardIds(
  slugs: string[]
): Promise<Map<string, string>> {
  const cards = await prisma.card.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });

  return new Map(cards.map((c) => [c.slug, c.id]));
}
