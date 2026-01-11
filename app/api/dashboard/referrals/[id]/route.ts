import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminKey, extractAdminKey } from "@/lib/auth/admin";
import { z } from "zod";

// Validation schema
const updateReferralSchema = z.object({
  url: z.string().url().optional(),
  label: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

/**
 * PUT /api/dashboard/referrals/[id]
 * Update a referral (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
    const validatedData = updateReferralSchema.parse(body);

    // Check if referral exists
    const existingReferral = await prisma.adminReferral.findUnique({
      where: { id },
    });

    if (!existingReferral) {
      return NextResponse.json(
        {
          success: false,
          error: "Referral not found",
        },
        { status: 404 }
      );
    }

    // Update referral
    const referral = await prisma.adminReferral.update({
      where: { id },
      data: validatedData,
      include: {
        card: {
          select: {
            name: true,
            issuer: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: referral,
    });
  } catch (error) {
    console.error("PUT /api/dashboard/referrals/[id] error:", error);

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
        error: "Failed to update referral",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dashboard/referrals/[id]
 * Delete a referral (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Check if referral exists
    const existingReferral = await prisma.adminReferral.findUnique({
      where: { id },
    });

    if (!existingReferral) {
      return NextResponse.json(
        {
          success: false,
          error: "Referral not found",
        },
        { status: 404 }
      );
    }

    // Delete referral
    await prisma.adminReferral.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Referral deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/dashboard/referrals/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete referral",
      },
      { status: 500 }
    );
  }
}
