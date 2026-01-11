import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractAdminKey, verifyAdminKey } from "@/lib/auth/admin";

/**
 * DELETE /api/dashboard/trees/[id]
 * Admin-only: delete a tree and its nodes
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminKey = extractAdminKey(request.headers);
    if (!verifyAdminKey(adminKey)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Ensure tree exists
    const existing = await prisma.cardTree.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Tree not found" },
        { status: 404 }
      );
    }

    await prisma.$transaction([
      prisma.cardNode.deleteMany({ where: { treeId: id } }),
      prisma.cardTree.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/dashboard/trees/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete tree" },
      { status: 500 }
    );
  }
}
