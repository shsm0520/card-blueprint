import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/token";
import { z } from "zod";

// Validation schema
const createNodeSchema = z.object({
  cardId: z.string().min(1),
  parentNodeId: z.string().optional().nullable(),
  position: z.number().int().min(0).optional().default(0),
  note: z.string().max(500).optional().default(""),
  plannedDate: z.string().optional().nullable(),
  monthsAfterPrevious: z.number().int().min(0).max(60).optional().nullable(),
  countsToward524: z.boolean().optional(), // Allow manual override
});

/**
 * Verify edit password for tree
 */
async function verifyTreeEditToken(
  treeId: string,
  editToken: string | null
): Promise<{ authorized: boolean; error?: string }> {
  if (!editToken) {
    return { authorized: false, error: "Edit password required" };
  }

  const tree = await prisma.cardTree.findUnique({
    where: { id: treeId },
    select: { editTokenHash: true },
  });

  if (!tree) {
    return { authorized: false, error: "Tree not found" };
  }

  const isValid = await verifyToken(editToken, tree.editTokenHash);
  if (!isValid) {
    return { authorized: false, error: "Invalid edit password" };
  }

  return { authorized: true };
}

/**
 * POST /api/trees/[id]/nodes
 * Add a new node to the tree (requires edit password)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: treeId } = await params;

    // Verify edit password
    const editToken = request.headers.get("x-edit-token");
    const authResult = await verifyTreeEditToken(treeId, editToken);

    if (!authResult.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error,
        },
        { status: authResult.error === "Tree not found" ? 404 : 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createNodeSchema.parse(body);

    // Fetch tree to check chase524Status
    const tree = await prisma.cardTree.findUnique({
      where: { id: treeId },
      select: { chase524Status: true },
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

    // Verify card exists
    const card = await prisma.card.findUnique({
      where: { id: validatedData.cardId, isActive: true },
      select: {
        id: true,
        issuer: true,
        cardType: true,
        countsToward524: true,
      },
    });

    if (!card) {
      return NextResponse.json(
        {
          success: false,
          error: "Card not found or inactive",
        },
        { status: 400 }
      );
    }

    // Determine if this card counts toward 5/24
    // Use manual override if provided, otherwise use card default
    const countsToward524 =
      validatedData.countsToward524 ?? card.countsToward524;

    // Calculate plannedDate if not provided
    let calculatedPlannedDate: Date | null = null;
    if (validatedData.plannedDate) {
      calculatedPlannedDate = new Date(validatedData.plannedDate);
    } else if (
      validatedData.parentNodeId &&
      validatedData.monthsAfterPrevious
    ) {
      // Auto-calculate based on parent's plannedDate + monthsAfterPrevious
      const parentNode = await prisma.cardNode.findFirst({
        where: {
          nodeId: validatedData.parentNodeId,
          treeId,
        },
        select: { plannedDate: true },
      });

      if (parentNode?.plannedDate) {
        calculatedPlannedDate = new Date(parentNode.plannedDate);
        calculatedPlannedDate.setMonth(
          calculatedPlannedDate.getMonth() + validatedData.monthsAfterPrevious
        );
      }
    }

    // Verify parent node exists if specified
    if (validatedData.parentNodeId) {
      const parentNode = await prisma.cardNode.findFirst({
        where: {
          nodeId: validatedData.parentNodeId,
          treeId,
        },
      });

      if (!parentNode) {
        return NextResponse.json(
          {
            success: false,
            error: "Parent node not found",
          },
          { status: 400 }
        );
      }
    }

    // 5/24 Validation: Check if tree is under 5/24 and card counts toward it
    if (tree.chase524Status === "under" && countsToward524) {
      // Count existing nodes that count toward 5/24
      const existingNodes = await prisma.cardNode.findMany({
        where: {
          treeId,
          countsToward524: true,
        },
        include: {
          card: {
            select: {
              issuer: true,
            },
          },
        },
      });

      // Filter nodes within 24 months if plannedDate exists
      let nodesIn24Months = existingNodes;
      if (calculatedPlannedDate) {
        const twentyFourMonthsAgo = new Date(calculatedPlannedDate);
        twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24);

        nodesIn24Months = existingNodes.filter((node) => {
          if (!node.plannedDate) return true; // Include nodes without dates (assume they count)
          return new Date(node.plannedDate) > twentyFourMonthsAgo;
        });
      }

      // Check if adding this card would violate 5/24 for Chase cards
      if (card.issuer === "Chase" && nodesIn24Months.length >= 5) {
        return NextResponse.json(
          {
            success: false,
            error: `5/24 Rule Violation: You already have ${nodesIn24Months.length} cards in the last 24 months. Chase cards require being under 5/24.`,
            warning: true,
          },
          { status: 400 }
        );
      }
    }

    // Create node
    const node = await prisma.cardNode.create({
      data: {
        nodeId: nanoid(16),
        treeId,
        cardId: validatedData.cardId,
        parentNodeId: validatedData.parentNodeId || null,
        position: validatedData.position,
        note: validatedData.note,
        plannedDate: calculatedPlannedDate,
        monthsAfterPrevious: validatedData.monthsAfterPrevious || null,
        countsToward524,
      },
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
    });

    // Parse tags
    const nodeWithParsedTags = {
      ...node,
      card: {
        ...node.card,
        tags: JSON.parse(node.card.tags),
      },
    };

    return NextResponse.json(
      {
        success: true,
        data: nodeWithParsedTags,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/trees/[id]/nodes error:", error);

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
        error: "Failed to create node",
      },
      { status: 500 }
    );
  }
}
