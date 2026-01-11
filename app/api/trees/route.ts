import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { generateTemplate, resolveCardIds } from "@/lib/templates";
import { z } from "zod";

// Validation schema
const createTreeSchema = z.object({
  title: z.string().min(1).max(100).optional().default("My Card Strategy"),
  ssnStatus: z.enum(["ssn", "itin", "none"]),
  useTemplate: z.boolean().optional().default(true),
  goal: z.enum(["cashback", "airline", "hotel", "status"]).optional(),
  chase524Status: z.enum(["under", "over", "unknown"]).optional(),
  creditProfile: z.enum(["thin", "1to3", "3plus"]).optional(),
  selectedCardSlug: z.string().optional(), // User-selected card from template
  note: z.string().max(1000).optional().default(""),
  password: z.string().min(4).max(50), // User's chosen password
});

/**
 * POST /api/trees
 * Create a new tree with template
 * No authentication required (nginx WAF handles rate limiting)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = createTreeSchema.parse(body);

    // Validate template fields if template is used
    if (validatedData.useTemplate) {
      if (
        !validatedData.goal ||
        !validatedData.chase524Status ||
        !validatedData.creditProfile
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Template requires goal, chase524Status, and creditProfile",
          },
          { status: 400 }
        );
      }
    }

    // Hash user's password
    const { hashToken } = await import("@/lib/auth/token");
    const editTokenHash = await hashToken(validatedData.password);

    // Generate public ID
    const publicId = nanoid(10); // Short, URL-friendly ID

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tree
      const tree = await tx.cardTree.create({
        data: {
          id: publicId,
          title: validatedData.title,
          ssnStatus: validatedData.ssnStatus,
          goal: validatedData.goal || "cashback",
          chase524Status: validatedData.chase524Status || "unknown",
          creditProfile: validatedData.creditProfile || "thin",
          note: validatedData.note,
          editTokenHash,
        },
      });

      // Only create nodes if template is requested and card is selected
      if (
        validatedData.useTemplate &&
        validatedData.selectedCardSlug &&
        validatedData.goal &&
        validatedData.chase524Status &&
        validatedData.creditProfile
      ) {
        // Find the selected card
        const selectedCard = await tx.card.findUnique({
          where: { slug: validatedData.selectedCardSlug },
          select: { id: true, slug: true, countsToward524: true },
        });

        if (!selectedCard) {
          throw new Error(`Card not found: ${validatedData.selectedCardSlug}`);
        }

        // Create a single node with the selected card
        const nodeId = nanoid(16);
        await tx.cardNode.create({
          data: {
            nodeId,
            treeId: tree.id,
            cardId: selectedCard.id,
            parentNodeId: null, // Root node
            position: 0,
            note: "Your first card - add more cards in edit mode!",
            countsToward524: selectedCard.countsToward524,
            monthsAfterPrevious: null,
          },
        });
      }

      return tree;
    });

    // Return tree ID (password is not returned - user already has it)
    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.id,
          title: result.title,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/trees error:", error);

    // Handle validation errors
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
        error: "Failed to create tree",
      },
      { status: 500 }
    );
  }
}
