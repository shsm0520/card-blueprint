import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { prisma } from '@/lib/prisma'
import {
  checkMultipleRateLimits,
  getClientIp,
  createRateLimitHeaders,
} from '@/lib/ratelimit'
import { generateTemplate, resolveCardIds } from '@/lib/templates'
import { z } from 'zod'

// Validation schema
const createTreeSchema = z.object({
  title: z.string().min(1).max(100).optional().default('My Card Strategy'),
  ssnStatus: z.enum(['ssn', 'itin', 'none']),
  useTemplate: z.boolean().optional().default(true),
  goal: z.enum(['cashback', 'airline', 'hotel', 'status']).optional(),
  chase524Status: z.enum(['under', 'over', 'unknown']).optional(),
  creditProfile: z.enum(['thin', '1to3', '3plus']).optional(),
  note: z.string().max(1000).optional().default(''),
  password: z.string().min(4).max(50), // User's chosen password
})

/**
 * POST /api/trees
 * Create a new tree with template
 * No authentication required, but rate limited
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request)
    const rateLimitResult = checkMultipleRateLimits(
      ['createTree', 'createTreeDaily'],
      clientIp
    )

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createTreeSchema.parse(body)

    // Validate template fields if template is used
    if (validatedData.useTemplate) {
      if (!validatedData.goal || !validatedData.chase524Status || !validatedData.creditProfile) {
        return NextResponse.json(
          {
            success: false,
            error: 'Template requires goal, chase524Status, and creditProfile',
          },
          { status: 400 }
        )
      }
    }

    // Hash user's password
    const { hashToken } = await import('@/lib/auth/token')
    const editTokenHash = await hashToken(validatedData.password)

    // Generate public ID
    const publicId = nanoid(10) // Short, URL-friendly ID

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tree
      const tree = await tx.cardTree.create({
        data: {
          id: publicId,
          title: validatedData.title,
          ssnStatus: validatedData.ssnStatus,
          goal: validatedData.goal || 'cashback',
          chase524Status: validatedData.chase524Status || 'unknown',
          creditProfile: validatedData.creditProfile || 'thin',
          note: validatedData.note,
          editTokenHash,
        },
      })

      // Only create nodes if template is requested
      if (validatedData.useTemplate && validatedData.goal && validatedData.chase524Status && validatedData.creditProfile) {
        // Generate template based on user profile
        const templateNodes = await generateTemplate({
          chase524Status: validatedData.chase524Status,
          creditProfile: validatedData.creditProfile,
          goal: validatedData.goal,
        })

        // Resolve card IDs from slugs
        const cardSlugs = templateNodes.map((n) => n.cardSlug)
        const cardIdMap = await resolveCardIds(cardSlugs)

        // Build node hierarchy
        const nodeIdMap = new Map<string, string>() // cardSlug -> nodeId

        // Create nodes
        for (const templateNode of templateNodes) {
          const cardId = cardIdMap.get(templateNode.cardSlug)
          if (!cardId) {
            throw new Error(`Card not found: ${templateNode.cardSlug}`)
          }

          const nodeId = nanoid(16)
          nodeIdMap.set(templateNode.cardSlug, nodeId)

          // Find parent node ID
          const parentNodeId = templateNode.parentCardSlug
            ? nodeIdMap.get(templateNode.parentCardSlug)
            : null

          await tx.cardNode.create({
            data: {
              nodeId,
              treeId: tree.id,
              cardId,
              parentNodeId: parentNodeId || null,
              position: templateNode.position,
              note: templateNode.note || '',
            },
          })
        }
      }

      return tree
    })

    // Return tree ID (password is not returned - user already has it)
    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.id,
          title: result.title,
        },
      },
      {
        status: 201,
        headers: createRateLimitHeaders(rateLimitResult),
      }
    )
  } catch (error) {
    console.error('POST /api/trees error:', error)

    // Handle validation errors
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
        error: 'Failed to create tree',
      },
      { status: 500 }
    )
  }
}
