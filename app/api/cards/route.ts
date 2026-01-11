import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/cards
 * Public API - Get all active cards
 * No authentication required
 */
export async function GET(request: NextRequest) {
  try {
    const cards = await prisma.card.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        issuer: true,
        cardType: true,
        annualFee: true,
        tags: true,
      },
      orderBy: [{ issuer: "asc" }, { annualFee: "asc" }, { name: "asc" }],
    });

    // Parse tags from JSON string
    const cardsWithParsedTags = cards.map((card) => ({
      ...card,
      tags: JSON.parse(card.tags),
    }));

    return NextResponse.json({
      success: true,
      data: cardsWithParsedTags,
    });
  } catch (error) {
    console.error("GET /api/cards error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch cards",
      },
      { status: 500 }
    );
  }
}
