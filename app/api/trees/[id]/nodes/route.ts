import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/token'
import { z } from 'zod'

// Validation schema
const createNodeSchema = z.object({
  cardId: z.string().min(1),
  parentNodeId: z.string().optional().nullable(),
  position: z.number().int().min(0).optional().default(0),
  note: z.string().max(500).optional().default(''),
  plannedDate: z.string().optional().nullable(),
  monthsAfterPrevious: z.number().int().min(0).max(60).optional().nullable(),
})

/**
 * Verify edit token for tree
 */
async function verifyTreeEditToken(
  treeId: string,
  editToken: string | null
): Promise<{ authorized: boolean; error?: string }> {
  if (!editToken) {
    return { authorized: false, error: 'Edit token required' }
  }

  const tree = await prisma.cardTree.findUnique({
    where: { id: treeId },
    select: { editTokenHash: true },
  })

  if (!tree) {
    return { authorized: false, error: 'Tree not found' }
  }

  const isValid = await verifyToken(editToken, tree.editTokenHash)
  if (!isValid) {
    return { authorized: false, error: 'Invalid edit token' }
  }

  return { authorized: true }
}

/**
 * POST /api/trees/[id]/nodes
 * Add a new node to the tree (requires edit_token)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: treeId } = await params

    // Verify edit token
    const editToken = request.headers.get('x-edit-token')
    const authResult = await verifyTreeEditToken(treeId, editToken)

    if (!authResult.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error,
        },
        { status: authResult.error === 'Tree not found' ? 404 : 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createNodeSchema.parse(body)

    // Verify card exists
    const card = await prisma.card.findUnique({
      where: { id: validatedData.cardId, isActive: true },
    })

    if (!card) {
      return NextResponse.json(
        {
          success: false,
          error: 'Card not found or inactive',
        },
        { status: 400 }
      )
    }

    // Verify parent node exists if specified
    if (validatedData.parentNodeId) {
      const parentNode = await prisma.cardNode.findFirst({
        where: {
          nodeId: validatedData.parentNodeId,
          treeId,
        },
      })

      if (!parentNode) {
        return NextResponse.json(
          {
            success: false,
            error: 'Parent node not found',
          },
          { status: 400 }
        )
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
        plannedDate: validatedData.plannedDate ? new Date(validatedData.plannedDate) : null,
        monthsAfterPrevious: validatedData.monthsAfterPrevious || null,
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
            rewardType: true,
            tags: true,
          },
        },
      },
    })

    // Parse tags
    const nodeWithParsedTags = {
      ...node,
      card: {
        ...node.card,
        tags: JSON.parse(node.card.tags),
      },
    }

    return NextResponse.json(
      {
        success: true,
        data: nodeWithParsedTags,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/trees/[id]/nodes error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create node',
      },
      { status: 500 }
    )
  }
}
