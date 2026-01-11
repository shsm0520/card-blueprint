import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminKey, extractAdminKey } from "@/lib/auth/admin";

/**
 * DELETE /api/admin/cards/[id]
 * Delete a card by ID (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Verify card exists
    const card = await prisma.card.findUnique({
      where: { id },
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

    // Delete the card
    await prisma.card.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Card "${card.name}" deleted successfully`,
    });
  } catch (error) {
    console.error("DELETE /api/admin/cards/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete card",
      },
      { status: 500 }
    );
  }
}
