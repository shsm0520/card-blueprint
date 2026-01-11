import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/token'
import { z } from 'zod'

// Validation schema
const updateNodeSchema = z.object({
  parentNodeId: z.string().optional().nullable(),
  position: z.number().int().min(0).optional(),
  note: z.string().max(500).optional(),
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
 * PUT /api/trees/[id]/nodes/[node_id]
 * Update a node (requires edit_token)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; node_id: string }> }
) {
  try {
    const { id: treeId, node_id: nodeId } = await params

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

    // Verify node exists and belongs to tree
    const existingNode = await prisma.cardNode.findFirst({
      where: {
        nodeId,
        treeId,
      },
    })

    if (!existingNode) {
      return NextResponse.json(
        {
          success: false,
          error: 'Node not found',
        },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = updateNodeSchema.parse(body)

    // Verify parent node exists if specified
    if (validatedData.parentNodeId !== undefined) {
      if (validatedData.parentNodeId === nodeId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Node cannot be its own parent',
          },
          { status: 400 }
        )
      }

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
        ...(validatedData.plannedDate !== undefined && {
          plannedDate: validatedData.plannedDate ? new Date(validatedData.plannedDate) : null,
        }),
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
            rewardType: true,
            tags: true,
          },
        },
      },
    })

    // Parse tags
    const nodeWithParsedTags = {
      ...updatedNode,
      card: {
        ...updatedNode.card,
        tags: JSON.parse(updatedNode.card.tags),
      },
    }

    return NextResponse.json({
      success: true,
      data: nodeWithParsedTags,
    })
  } catch (error) {
    console.error('PUT /api/trees/[id]/nodes/[node_id] error:', error)

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
        error: 'Failed to update node',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/trees/[id]/nodes/[node_id]
 * Delete a node (requires edit_token)
 * WARNING: This will also delete all child nodes due to CASCADE
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; node_id: string }> }
) {
  try {
    const { id: treeId, node_id: nodeId } = await params

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

    // Verify node exists and belongs to tree
    const existingNode = await prisma.cardNode.findFirst({
      where: {
        nodeId,
        treeId,
      },
    })

    if (!existingNode) {
      return NextResponse.json(
        {
          success: false,
          error: 'Node not found',
        },
        { status: 404 }
      )
    }

    // Delete node (will cascade to children)
    await prisma.cardNode.delete({
      where: {
        nodeId,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Node deleted successfully',
    })
  } catch (error) {
    console.error('DELETE /api/trees/[id]/nodes/[node_id] error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete node',
      },
      { status: 500 }
    )
  }
}
