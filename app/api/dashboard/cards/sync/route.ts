import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractAdminKey, verifyAdminKey } from "@/lib/auth/admin";
import { crawlChaseAllCards } from "@/lib/scraper/chase";
import { crawlAmexAllCards } from "@/lib/scraper/amex";

/**
 * POST /api/dashboard/cards/sync
 * Admin-only: crawl Chase and Amex cards and upsert into Card table
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

    // Get issuer query param (optional)
    const url = new URL(request.url);
    const issuerParam = url.searchParams.get("issuer")?.toLowerCase();

    let allCards: Array<{
      name: string;
      href: string;
      slug: string;
      issuer: string;
      annualFee?: number;
      rewardType?: string;
      benefits?: string[];
    }> = [];

    // Crawl Chase
    if (!issuerParam || issuerParam === "chase") {
      console.log("Crawling Chase cards...");
      const chaseCards = await crawlChaseAllCards();
      allCards.push(
        ...chaseCards.map((card) => ({
          ...card,
          issuer: "Chase",
        }))
      );
    }

    // Crawl Amex
    if (!issuerParam || issuerParam === "amex") {
      console.log("Crawling Amex cards...");
      const amexCards = await crawlAmexAllCards();
      allCards.push(
        ...amexCards.map((card) => ({
          ...card,
          slug: `amex-${card.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")}`,
          issuer: "American Express",
        }))
      );
    }

    const results = await Promise.allSettled(
      allCards.map((card) => {
        // Determine card type and 5/24 counting
        const isBusiness = /business/i.test(card.name);
        const cardType = isBusiness ? "business" : "personal";
        const countsToward524 = !isBusiness; // Business cards don't count toward 5/24

        // Build tags array: start with rewardType if available, then add benefits
        const tags: string[] = [];
        if (card.rewardType) {
          tags.push(card.rewardType);
        }
        if (card.benefits && card.benefits.length > 0) {
          tags.push(...card.benefits);
        }

        return prisma.card.upsert({
          where: { slug: card.slug },
          update: {
            name: card.name,
            issuer: card.issuer,
            cardType,
            annualFee: card.annualFee ?? 0,
            tags: JSON.stringify(tags),
            countsToward524,
            externalUrls: JSON.stringify([card.href]),
            lastCrawledAt: new Date(),
            crawlStatus: "ok",
            crawlError: null,
          },
          create: {
            slug: card.slug,
            name: card.name,
            issuer: card.issuer,
            cardType,
            annualFee: card.annualFee ?? 0,
            tags: JSON.stringify(tags),
            countsToward524,
            externalUrls: JSON.stringify([card.href]),
            lastCrawledAt: new Date(),
            crawlStatus: "ok",
          },
        });
      })
    );

    const upserts = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected");

    if (failed.length) {
      console.error("Card sync failures", failed);
    }

    return NextResponse.json({
      success: true,
      summary: {
        fetched: allCards.length,
        upserts,
        failed: failed.length,
        byIssuer: {
          chase: allCards.filter((c) => c.issuer === "Chase").length,
          amex: allCards.filter((c) => c.issuer === "American Express").length,
        },
      },
    });
  } catch (error) {
    console.error("POST /card/api/dashboard/cards/sync/ error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync cards" },
      { status: 500 }
    );
  }
}
