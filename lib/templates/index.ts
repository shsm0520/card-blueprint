/**
 * Tree template generation based on user inputs
 * Provides starter card recommendations based on:
 * - Chase 5/24 status
 * - Credit profile (thin/1-3yr/3+yr)
 * - Goal (cashback/airline/hotel/status)
 */

import { prisma } from '@/lib/prisma'

export interface TemplateInput {
  chase524Status: 'under' | 'over' | 'unknown'
  creditProfile: 'thin' | '1to3' | '3plus'
  goal: 'cashback' | 'airline' | 'hotel' | 'status'
}

export interface TemplateNode {
  cardSlug: string
  parentCardSlug?: string // undefined = root node
  position: number
  note?: string
}

/**
 * Generate a starter template based on user profile
 */
export async function generateTemplate(
  input: TemplateInput
): Promise<TemplateNode[]> {
  const { chase524Status, creditProfile, goal } = input

  // Thin file users should start with no-annual-fee cards
  if (creditProfile === 'thin') {
    return getThinFileTemplate(goal)
  }

  // Under 5/24: Prioritize Chase cards
  if (chase524Status === 'under') {
    return getUnder524Template(creditProfile, goal)
  }

  // Over 5/24 or unknown: Focus on Amex, Citi, Capital One
  return getOver524Template(creditProfile, goal)
}

/**
 * Template for users with thin credit file (0-12 months)
 * Start with beginner-friendly cards
 */
function getThinFileTemplate(goal: string): TemplateNode[] {
  const template: TemplateNode[] = []

  // Step 1: Build credit with no-annual-fee card
  template.push({
    cardSlug: 'chase-freedom-unlimited',
    position: 0,
    note: 'Start here: Build credit history with no annual fee',
  })

  // Step 2: Add another no-fee card after 3-6 months
  template.push({
    cardSlug: 'chase-freedom-flex',
    parentCardSlug: 'chase-freedom-unlimited',
    position: 1,
    note: 'After 3-6 months of good payment history',
  })

  // Step 3: First premium card based on goal
  if (goal === 'cashback') {
    template.push({
      cardSlug: 'amex-blue-cash-preferred',
      parentCardSlug: 'chase-freedom-flex',
      position: 2,
      note: 'After 6-12 months: First annual fee card',
    })
  } else {
    template.push({
      cardSlug: 'chase-sapphire-preferred',
      parentCardSlug: 'chase-freedom-flex',
      position: 2,
      note: 'After 6-12 months: Start earning transferable points',
    })
  }

  return template
}

/**
 * Template for under 5/24 users
 * Maximize Chase cards before hitting 5/24
 */
function getUnder524Template(
  creditProfile: string,
  goal: string
): TemplateNode[] {
  const template: TemplateNode[] = []

  // Starting card based on goal
  if (goal === 'cashback') {
    // Cashback strategy
    template.push({
      cardSlug: 'chase-freedom-unlimited',
      position: 0,
      note: 'Foundation: 1.5% cashback on everything',
    })

    template.push({
      cardSlug: 'chase-freedom-flex',
      parentCardSlug: 'chase-freedom-unlimited',
      position: 1,
      note: '5% rotating categories',
    })

    if (creditProfile === '3plus') {
      template.push({
        cardSlug: 'chase-sapphire-preferred',
        parentCardSlug: 'chase-freedom-flex',
        position: 2,
        note: 'Convert cashback to travel points (optional)',
      })
    }
  } else {
    // Travel strategy (airline/hotel/status)
    template.push({
      cardSlug: 'chase-sapphire-preferred',
      position: 0,
      note: 'Foundation: Chase Ultimate Rewards ecosystem',
    })

    template.push({
      cardSlug: 'chase-freedom-unlimited',
      parentCardSlug: 'chase-sapphire-preferred',
      position: 1,
      note: 'Earn more UR on everyday spending',
    })

    template.push({
      cardSlug: 'chase-ink-business-preferred',
      parentCardSlug: 'chase-sapphire-preferred',
      position: 2,
      note: 'Business card: Earn UR on business spend (doesn\'t count toward 5/24)',
    })

    if (creditProfile === '3plus') {
      template.push({
        cardSlug: 'chase-sapphire-reserve',
        parentCardSlug: 'chase-ink-business-preferred',
        position: 3,
        note: 'Upgrade: Premium travel benefits',
      })
    }
  }

  return template
}

/**
 * Template for over 5/24 users
 * Focus on Amex, Citi, Capital One
 */
function getOver524Template(
  creditProfile: string,
  goal: string
): TemplateNode[] {
  const template: TemplateNode[] = []

  if (goal === 'cashback') {
    // Cashback strategy without Chase
    template.push({
      cardSlug: 'citi-double-cash',
      position: 0,
      note: 'Foundation: 2% on everything, no annual fee',
    })

    template.push({
      cardSlug: 'citi-custom-cash',
      parentCardSlug: 'citi-double-cash',
      position: 1,
      note: '5% on top spending category',
    })

    template.push({
      cardSlug: 'amex-blue-cash-preferred',
      parentCardSlug: 'citi-custom-cash',
      position: 2,
      note: '6% on groceries, 3% on gas',
    })
  } else if (goal === 'airline') {
    // Airline strategy
    template.push({
      cardSlug: 'amex-platinum',
      position: 0,
      note: 'Premium: 5x on flights, lounge access',
    })

    template.push({
      cardSlug: 'amex-gold',
      parentCardSlug: 'amex-platinum',
      position: 1,
      note: '4x on dining, earn MR for flights',
    })

    template.push({
      cardSlug: 'capital-one-venture-x',
      parentCardSlug: 'amex-gold',
      position: 2,
      note: 'Alternative: Simple redemption, lounge access',
    })
  } else {
    // Hotel/Status strategy
    template.push({
      cardSlug: 'amex-platinum',
      position: 0,
      note: 'Foundation: Hotel status benefits',
    })

    template.push({
      cardSlug: 'capital-one-venture-x',
      parentCardSlug: 'amex-platinum',
      position: 1,
      note: 'Flexible points for hotel bookings',
    })
  }

  return template
}

/**
 * Validate that all cards in template exist in database
 */
export async function validateTemplate(
  nodes: TemplateNode[]
): Promise<boolean> {
  const slugs = nodes.map((n) => n.cardSlug)
  const cards = await prisma.card.findMany({
    where: { slug: { in: slugs }, isActive: true },
    select: { slug: true },
  })

  const foundSlugs = new Set(cards.map((c) => c.slug))
  return slugs.every((slug) => foundSlugs.has(slug))
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
  })

  return new Map(cards.map((c) => [c.slug, c.id]))
}
