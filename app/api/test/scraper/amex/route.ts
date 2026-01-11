import { NextResponse } from "next/server";
import { crawlAmexAllCards } from "@/lib/scraper/amex";

/**
 * GET /api/test/scraper/amex
 * Test endpoint for Amex scraper
 */
export async function GET() {
  try {
    const cards = await crawlAmexAllCards();

    return NextResponse.json({
      success: true,
      count: cards.length,
      cards: cards.map((card) => ({
        name: card.name,
        href: card.href,
        annualFee: card.annualFee,
        rewardType: card.rewardType,
        benefitsCount: card.benefits?.length || 0,
      })),
    });
  } catch (error) {
    console.error("Amex scraper test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
