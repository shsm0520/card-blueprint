'use client'

import { memo, useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { CreditCard, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface CardNodeProps {
  data: {
    card: {
      id: string
      slug: string
      name: string
      issuer: string
      cardType: string
      annualFee: number
      rewardType: string
      tags: string[]
    }
    note: string
    plannedDate?: string | null
    monthsAfterPrevious?: number | null
    treeId: string
  }
}

function CardNode({ data }: CardNodeProps) {
  const { card, note, plannedDate, monthsAfterPrevious } = data
  const [referrals, setReferrals] = useState<
    Array<{ id: string; url: string; label: string }>
  >([])
  const [loading, setLoading] = useState(true)

  // Fetch referrals for this card
  useEffect(() => {
    async function fetchReferrals() {
      try {
        const res = await fetch(`/card/api/referrals/?card_id=${card.id}/`)
        const data = await res.json()
        if (data.success) {
          setReferrals(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch referrals:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReferrals()
  }, [card.id])

  return (
    <div className="relative z-10">
      <Handle type="target" position={Position.Left} className="w-3 h-3" />

      <div className="w-80 bg-white border-2 border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow relative z-10">
        {/* Card Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                {card.name}
              </h3>
              <p className="text-xs text-gray-600 mt-1">{card.issuer}</p>
            </div>
          </div>
        </div>

        {/* Card Details */}
        <div className="p-4 space-y-3">
          {/* Annual Fee & Reward Type */}
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-gray-500">Annual Fee:</span>
              <span className="ml-2 font-semibold text-gray-900">
                {card.annualFee === 0 ? 'No Fee' : `$${card.annualFee}`}
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {card.rewardType}
            </Badge>
          </div>

          {/* Tags */}
          {card.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {card.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-xs px-2 py-0"
                >
                  {tag}
                </Badge>
              ))}
              {card.tags.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-0">
                  +{card.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Timeline info */}
          {(plannedDate || monthsAfterPrevious) && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs space-y-1">
              {plannedDate && (
                <div className="flex items-center gap-1 text-blue-700">
                  <span className="font-semibold">Planned:</span>
                  <span>{new Date(plannedDate).toLocaleDateString()}</span>
                </div>
              )}
              {monthsAfterPrevious && (
                <div className="flex items-center gap-1 text-blue-700">
                  <span className="font-semibold">Wait:</span>
                  <span>{monthsAfterPrevious} months after previous</span>
                </div>
              )}
            </div>
          )}

          {/* Note */}
          {note && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-gray-700">
              <p className="leading-relaxed">{note}</p>
            </div>
          )}

          {/* Referral Buttons */}
          {!loading && referrals.length > 0 && (
            <div className="pt-2 space-y-2">
              {referrals.map((referral) => (
                <a
                  key={referral.id}
                  href={referral.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  {referral.label}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </div>
  )
}

export default memo(CardNode)
