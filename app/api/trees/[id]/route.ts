import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/token";

/**
 * GET /api/trees/[id]
 * Public API - Get tree by public ID
 * Increments view count
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch tree with all nodes
    const tree = await prisma.cardTree.findUnique({
      where: { id },
      include: {
        nodes: {
          include: {
            card: {
              select: {
                id: true,
                slug: true,
                name: true,
                issuer: true,
                cardType: true,
                annualFee: true,
                tags: true,
                countsToward524: true,
              },
            },
          },
          orderBy: {
            position: "asc",
          },
        },
      },
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

    // Increment view count asynchronously
    prisma.cardTree
      .update({
        where: { id },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      })
      .catch((error) => {
        console.error("Failed to increment view count:", error);
      });

    // Parse tags for each card
    const nodesWithParsedTags = tree.nodes.map((node) => ({
      ...node,
      card: {
        ...node.card,
        tags: JSON.parse(node.card.tags),
      },
    }));

    // Don't expose edit token hash
    const { editTokenHash, ...treeData } = tree;

    return NextResponse.json({
      success: true,
      data: {
        ...treeData,
        nodes: nodesWithParsedTags,
      },
    });
  } catch (error) {
    console.error("GET /api/trees/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch tree",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/trees/[id]
 * Update tree metadata (requires edit_token)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get edit token from header
    const editToken = request.headers.get("x-edit-token");
    if (!editToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Edit token required",
        },
        { status: 401 }
      );
    }

    // Verify tree exists and get token hash
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

    // Verify edit token
    const isValid = await verifyToken(editToken, tree.editTokenHash);
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid edit token",
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, note } = body;

    // Update tree
    const updatedTree = await prisma.cardTree.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(note !== undefined && { note }),
      },
      select: {
        id: true,
        title: true,
        goal: true,
        chase524Status: true,
        creditProfile: true,
        note: true,
        viewCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedTree,
    });
  } catch (error) {
    console.error("PUT /api/trees/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update tree",
      },
      { status: 500 }
    );
  }
}
