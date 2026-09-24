import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/token";

/**
 * POST /api/trees/[id]/verify
 * Verify edit password for tree without updating any tree metadata or timestamps
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get edit password from header
    const editToken = request.headers.get("x-edit-token");
    if (!editToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Edit password required",
        },
        { status: 401 }
      );
    }

    // Verify tree exists and get password hash
    const tree = await prisma.cardTree.findUnique({
      where: { id },
      select: { editTokenHash: true },
    });

    if (!tree) {
      return NextResponse.json(
        {
          success: false,
          error: "Tree not found",
        },
        { status: 404 }
      );
    }

    // Verify edit password
    const isValid = await verifyToken(editToken, tree.editTokenHash);
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid edit password",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password verified",
    });
  } catch (error) {
    console.error("POST /api/trees/[id]/verify error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify password",
      },
      { status: 500 }
    );
  }
}
