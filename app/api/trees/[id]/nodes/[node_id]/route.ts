import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/token";
import { z } from "zod";
import { validateChase524Status } from "@/lib/chase524";

// Validation schema
const updateNodeSchema = z.object({
  parentNodeId: z.string().optional().nullable(),
  position: z.number().int().min(0).optional(),
  note: z.string().max(500).optional(),
  plannedDate: z.string().optional().nullable(),
  monthsAfterPrevious: z.number().int().min(0).max(60).optional().nullable(),
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
 * PUT /api/trees/[id]/nodes/[node_id]
 * Update a node (requires edit password)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; node_id: string }> }
) {
  try {
    const { id: treeId, node_id: nodeId } = await params;

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

    // Verify node exists and belongs to tree
    const existingNode = await prisma.cardNode.findFirst({
      where: {
        nodeId,
        treeId,
      },
      include: {
        card: {
          select: {
            issuer: true,
          },
        },
      },
    });

    if (!existingNode) {
      return NextResponse.json(
        {
          success: false,
          error: "Node not found",
        },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateNodeSchema.parse(body);

    // Verify parent node exists and is not a descendant (prevent circular relationship)
    if (validatedData.parentNodeId !== undefined) {
      if (validatedData.parentNodeId === nodeId) {
        return NextResponse.json(
          {
            success: false,
            error: "Node cannot be its own parent",
          },
          { status: 400 }
        );
      }

      if (validatedData.parentNodeId) {
        const allNodes = await prisma.cardNode.findMany({
          where: { treeId },
          select: { nodeId: true, parentNodeId: true },
        });

        const targetParentNode = allNodes.find(
          (n) => n.nodeId === validatedData.parentNodeId
        );

        if (!targetParentNode) {
          return NextResponse.json(
            {
              success: false,
              error: "Parent node not found",
            },
            { status: 400 }
          );
        }

        // Check if the target parent is a descendant of current nodeId
        const parentMap = new Map<string, string | null>();
        allNodes.forEach((n) => parentMap.set(n.nodeId, n.parentNodeId));

        let currentId: string | null = validatedData.parentNodeId;
        const visited = new Set<string>();

        while (currentId) {
          if (currentId === nodeId) {
            return NextResponse.json(
              {
                success: false,
                error: "Cannot set parent node to a descendant node (circular dependency)",
              },
              { status: 400 }
            );
          }
          if (visited.has(currentId)) {
            break;
          }
          visited.add(currentId);
          currentId = parentMap.get(currentId) || null;
        }
      }
    }

    // Calculate effective plannedDate for the node
    let effectivePlannedDate: Date | null = existingNode.plannedDate;

    if (validatedData.plannedDate !== undefined) {
      effectivePlannedDate = validatedData.plannedDate
        ? new Date(validatedData.plannedDate)
        : null;
    } else if (
      validatedData.parentNodeId !== undefined ||
      validatedData.monthsAfterPrevious !== undefined
    ) {
      const parentId =
        validatedData.parentNodeId !== undefined
          ? validatedData.parentNodeId
          : existingNode.parentNodeId;
      const monthsAfter =
        validatedData.monthsAfterPrevious !== undefined
          ? validatedData.monthsAfterPrevious
          : existingNode.monthsAfterPrevious;

      if (parentId && monthsAfter) {
        const parentNode = await prisma.cardNode.findFirst({
          where: {
            nodeId: parentId,
            treeId,
          },
          select: { plannedDate: true },
        });

        if (parentNode?.plannedDate) {
          effectivePlannedDate = new Date(parentNode.plannedDate);
          effectivePlannedDate.setMonth(
            effectivePlannedDate.getMonth() + monthsAfter
          );
        }
      }
    }

    // Check 5/24 validation on date update
    const tree = await prisma.cardTree.findUnique({
      where: { id: treeId },
      select: { chase524Status: true },
    });

    if (tree) {
      const allTreeNodes = await prisma.cardNode.findMany({
        where: { treeId },
        select: {
          nodeId: true,
          plannedDate: true,
          countsToward524: true,
        },
      });

      const validationResult = validateChase524Status({
        chase524Status: tree.chase524Status,
        targetCardIssuer: existingNode.card.issuer,
        targetCardCountsToward524: existingNode.countsToward524,
        targetPlannedDate: effectivePlannedDate,
        existingNodes: allTreeNodes,
        currentNodeId: nodeId,
      });

      if (!validationResult.valid) {
        return NextResponse.json(
          {
            success: false,
            error: validationResult.error,
            warning: true,
          },
          { status: 400 }
        );
      }
    }

    // Update node
    const updatedNode = await prisma.cardNode.update({
      where: {
        nodeId,
      },
      data: {
        ...(validatedData.parentNodeId !== undefined && {
          parentNodeId: validatedData.parentNodeId,
        }),
        ...(validatedData.position !== undefined && {
          position: validatedData.position,
        }),
        ...(validatedData.note !== undefined && {
          note: validatedData.note,
        }),
        plannedDate: effectivePlannedDate,
        ...(validatedData.monthsAfterPrevious !== undefined && {
          monthsAfterPrevious: validatedData.monthsAfterPrevious,
        }),
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
          },
        },
      },
    });

    // Parse tags
    const nodeWithParsedTags = {
      ...updatedNode,
      card: {
        ...updatedNode.card,
        tags: JSON.parse(updatedNode.card.tags),
      },
    };

    return NextResponse.json({
      success: true,
      data: nodeWithParsedTags,
    });
  } catch (error) {
    console.error("PUT /api/trees/[id]/nodes/[node_id] error:", error);

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
        error: "Failed to update node",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trees/[id]/nodes/[node_id]
 * Delete a node (requires edit password)
 * WARNING: This will also delete all child nodes due to CASCADE
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; node_id: string }> }
) {
  try {
    const { id: treeId, node_id: nodeId } = await params;

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

    // Verify node exists and belongs to tree
    const existingNode = await prisma.cardNode.findFirst({
      where: {
        nodeId,
        treeId,
      },
    });

    if (!existingNode) {
      return NextResponse.json(
        {
          success: false,
          error: "Node not found",
        },
        { status: 404 }
      );
    }

    // Delete node (will cascade to children)
    await prisma.cardNode.delete({
      where: {
        nodeId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Node deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/trees/[id]/nodes/[node_id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete node",
      },
      { status: 500 }
    );
  }
}
