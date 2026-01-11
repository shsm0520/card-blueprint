import { NextRequest, NextResponse } from "next/server";
import { generateTemplate } from "@/lib/templates";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const previewSchema = z.object({
  chase524Status: z.enum(["under", "over", "unknown"]),
  creditProfile: z.enum(["thin", "1to3", "3plus"]),
  goal: z.enum(["cashback", "airline", "hotel", "status"]),
});

/**
 * POST /api/templates/preview
 * Preview what cards would be included in a template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = previewSchema.parse(body);

    // Generate template nodes
    const templateNodes = await generateTemplate(validatedData);

    // Fetch card details for preview
    const cardSlugs = templateNodes.map((node) => node.cardSlug);
    const cards = await prisma.card.findMany({
      where: {
        slug: { in: cardSlugs },
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        issuer: true,
        annualFee: true,
        tags: true,
      },
    });

    // Create a map for easy lookup
    const cardMap = new Map(cards.map((card) => [card.slug, card]));

    // Build preview with card details
    const preview = templateNodes
      .map((node) => {
        const card = cardMap.get(node.cardSlug);
        if (!card) return null;

        return {
          card: {
            id: card.id,
            slug: card.slug,
            name: card.name,
            issuer: card.issuer,
            annualFee: card.annualFee,
            tags: JSON.parse(card.tags),
          },
          note: node.note,
          monthsAfterPrevious: node.monthsAfterPrevious,
          position: node.position,
          parentCardSlug: node.parentCardSlug,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      data: {
        preview,
        totalCards: preview.length,
        description: getTemplateDescription(validatedData),
      },
    });
  } catch (error) {
    console.error("POST /api/templates/preview error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate template preview",
      },
      { status: 500 }
    );
  }
}

function getTemplateDescription(input: {
  chase524Status: string;
  creditProfile: string;
  goal: string;
}): string {
  const { chase524Status, creditProfile, goal } = input;

  const goalLabel = {
    cashback: "Cashback",
    airline: "Airline Miles",
    hotel: "Hotel Points",
    status: "Hotel Lifetime Status",
  }[goal];

  const profileLabel = {
    thin: "No/Thin Credit File",
    "1to3": "1-3 Years Credit History",
    "3plus": "3+ Years Credit History",
  }[creditProfile];

  const chase524Label = {
    under: "Under Chase 5/24",
    over: "Over/At Chase 5/24",
    unknown: "Unknown 5/24 Status",
  }[chase524Status];

  if (creditProfile === "thin") {
    return `Beginner-friendly cards for ${profileLabel}. Start with no-annual-fee cards to build credit history, then move to premium cards.`;
  }

  if (chase524Status === "under") {
    return `Maximize Chase cards for ${goalLabel}. Priority on Chase before hitting 5/24 limit.`;
  }

  return `Focus on Amex, Citi, and Capital One for ${goalLabel}. Non-Chase issuers since you're ${chase524Label}.`;
}
