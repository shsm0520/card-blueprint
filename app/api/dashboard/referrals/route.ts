import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { verifyAdminKey, extractAdminKey } from "@/lib/auth/admin";
import { z } from "zod";

// Validation schema
const createReferralSchema = z.object({
  cardId: z.string().min(1),
  url: z.string().url(),
  label: z.string().min(1).max(100).optional().default("Apply Now"),
  isActive: z.boolean().optional().default(true),
});

/**
 * POST /api/dashboard/referrals
 * Create a new referral (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin key
    const adminKey = extractAdminKey(request.headers);
    if (!verifyAdminKey(adminKey)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createReferralSchema.parse(body);

    // Verify card exists
    const card = await prisma.card.findUnique({
      where: { id: validatedData.cardId },
    });

    if (!card) {
      return NextResponse.json(
        {
          success: false,
          error: "Card not found",
        },
        { status: 404 }
      );
    }

    // Create referral
    const referral = await prisma.adminReferral.create({
      data: {
        id: nanoid(16),
        cardId: validatedData.cardId,
        url: validatedData.url,
        label: validatedData.label,
        isActive: validatedData.isActive,
      },
      include: {
        card: {
          select: {
            name: true,
            issuer: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: referral,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/dashboard/referrals error:", error);

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
        error: "Failed to create referral",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/dashboard/referrals
 * Get all referrals (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin key
    const adminKey = extractAdminKey(request.headers);
    if (!verifyAdminKey(adminKey)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const referrals = await prisma.adminReferral.findMany({
      include: {
        card: {
          select: {
            id: true,
            name: true,
            issuer: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: referrals,
    });
  } catch (error) {
    console.error("GET /api/dashboard/referrals error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch referrals",
      },
      { status: 500 }
    );
  }
}
