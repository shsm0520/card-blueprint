import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractAdminKey, verifyAdminKey } from "@/lib/auth/admin";
import { crawlChaseAllCards } from "@/lib/scraper/chase";

/**
 * POST /api/admin/cards/sync
 * Admin-only: crawl Chase all-credit-cards page and upsert into Card table
 */
export async function POST(request: NextRequest) {
  try {
    const adminKey = extractAdminKey(request.headers);
    if (!verifyAdminKey(adminKey)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const cards = await crawlChaseAllCards();

    const results = await Promise.allSettled(
      cards.map((card) =>
        prisma.card.upsert({
          where: { slug: card.slug },
          update: {
            name: card.name,
            issuer: "Chase",
            cardType: "personal",
            annualFee: 0,
            rewardType: "unknown",
            tags: "[]",
            externalUrls: JSON.stringify([card.href]),
            lastCrawledAt: new Date(),
            crawlStatus: "ok",
            crawlError: null,
          },
          create: {
            slug: card.slug,
            name: card.name,
            issuer: "Chase",
            cardType: "personal",
            annualFee: 0,
            rewardType: "unknown",
            tags: "[]",
            externalUrls: JSON.stringify([card.href]),
            lastCrawledAt: new Date(),
            crawlStatus: "ok",
          },
        })
      )
    );

    const upserts = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected");

    if (failed.length) {
      console.error("Card sync failures", failed);
    }

    return NextResponse.json({
      success: true,
      summary: {
        fetched: cards.length,
        upserts,
        failed: failed.length,
      },
    });
  } catch (error) {
    console.error("POST /api/admin/cards/sync error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync cards" },
      { status: 500 }
    );
  }
}
