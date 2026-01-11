import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/referrals?card_id=xxx
 * Public API - Get active referrals for a specific card
 * No authentication required
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cardId = searchParams.get('card_id')

    if (!cardId) {
      return NextResponse.json(
        {
          success: false,
          error: 'card_id parameter is required',
        },
        { status: 400 }
      )
    }

    const referrals = await prisma.adminReferral.findMany({
      where: {
        cardId,
        isActive: true,
      },
      select: {
        id: true,
        url: true,
        label: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: referrals,
    })
  } catch (error) {
    console.error('GET /api/referrals error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch referrals',
      },
      { status: 500 }
    )
  }
}
