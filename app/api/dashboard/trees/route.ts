import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractAdminKey, verifyAdminKey } from "@/lib/auth/admin";

/**
 * GET /api/dashboard/trees
 * Admin-only: list all trees with summary info
 */
export async function GET(request: NextRequest) {
  try {
    const adminKey = extractAdminKey(request.headers);
    if (!verifyAdminKey(adminKey)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const trees = await prisma.cardTree.findMany({
      select: {
        id: true,
        title: true,
        goal: true,
        chase524Status: true,
        creditProfile: true,
        viewCount: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: trees });
  } catch (error) {
    console.error("GET /api/dashboard/trees error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list trees" },
      { status: 500 }
    );
  }
}
