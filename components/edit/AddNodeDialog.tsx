'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

interface AddNodeDialogProps {
  treeId: string
  editToken: string
  existingNodes: Array<{
    nodeId: string
    cardId: string
    card: {
      id: string
      name: string
    }
  }>
  onClose: () => void
  onAdd: () => void
}

export default function AddNodeDialog({
  treeId,
  editToken,
  existingNodes,
  onClose,
  onAdd,
}: AddNodeDialogProps) {
  const [cards, setCards] = useState<
    Array<{ id: string; name: string; issuer: string }>
  >([])
  const [issuers, setIssuers] = useState<string[]>([])
  const [selectedIssuer, setSelectedIssuer] = useState<string>('')
  const [selectedCardId, setSelectedCardId] = useState<string>('')
  const [parentNodeId, setParentNodeId] = useState<string>('none')
  const [note, setNote] = useState('')
  const [plannedDate, setPlannedDate] = useState('')
  const [monthsAfterPrevious, setMonthsAfterPrevious] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingCards, setIsFetchingCards] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch available cards
  useEffect(() => {
    async function fetchCards() {
      try {
        const res = await fetch('/card/api/cards/')
        const data = await res.json()
        if (data.success) {
          setCards(data.data)
          // Extract unique issuers
          const uniqueIssuers = Array.from(
            new Set(data.data.map((card: any) => card.issuer))
          ).sort()
          setIssuers(uniqueIssuers as string[])
        }
      } catch (err) {
        console.error('Failed to fetch cards:', err)
      } finally {
        setIsFetchingCards(false)
      }
    }

    fetchCards()
  }, [])

  // Filter cards by selected issuer
  const filteredCards = selectedIssuer
    ? cards.filter((card) => card.issuer === selectedIssuer)
    : []

  // Reset selected card when issuer changes
  useEffect(() => {
    setSelectedCardId('')
  }, [selectedIssuer])

  const handleAdd = async () => {
    if (!selectedCardId) {
      setError('Please select a card')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/card/api/trees/${treeId}/nodes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Edit-Token': editToken,
        },
        body: JSON.stringify({
          cardId: selectedCardId,
          parentNodeId: parentNodeId === 'none' ? null : parentNodeId,
          position: existingNodes.length,
          note,
          plannedDate: plannedDate || null,
          monthsAfterPrevious: monthsAfterPrevious ? parseInt(monthsAfterPrevious) : null,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to add node')
      }

      onAdd()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Card to Tree</DialogTitle>
          <DialogDescription>
            Choose a card to add to your strategy
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Issuer Selection */}
          <div className="space-y-2">
            <Label>Card Issuer *</Label>
            {isFetchingCards ? (
              <div className="text-sm text-gray-500">Loading issuers...</div>
            ) : (
              <Select value={selectedIssuer} onValueChange={setSelectedIssuer}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a card issuer" />
                </SelectTrigger>
                <SelectContent>
                  {issuers.map((issuer) => (
                    <SelectItem key={issuer} value={issuer}>
                      {issuer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-gray-500">
              Select the card issuer first
            </p>
          </div>

          {/* Card Selection - Only show if issuer is selected */}
          {selectedIssuer && (
            <div className="space-y-2">
              <Label>Select Card *</Label>
              <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a card" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Parent Node */}
          <div className="space-y-2">
            <Label>Parent Card (Optional)</Label>
            <Select value={parentNodeId} onValueChange={setParentNodeId}>
              <SelectTrigger>
                <SelectValue placeholder="None (root level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (root level)</SelectItem>
                {existingNodes.map((node) => (
                  <SelectItem key={node.nodeId} value={node.nodeId}>
                    {node.card.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              This card will appear as a child of the selected parent
            </p>
          </div>

          {/* Planned Date */}
          <div className="space-y-2">
            <Label htmlFor="plannedDate">Planned Application Date (Optional)</Label>
            <Input
              id="plannedDate"
              type="date"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              When do you plan to apply for this card?
            </p>
          </div>

          {/* Months After Previous */}
          <div className="space-y-2">
            <Label htmlFor="monthsAfterPrevious">
              Months to Wait After Previous Card (Optional)
            </Label>
            <Input
              id="monthsAfterPrevious"
              type="number"
              min="0"
              max="60"
              value={monthsAfterPrevious}
              onChange={(e) => setMonthsAfterPrevious(e.target.value)}
              placeholder="e.g., 3"
            />
            <p className="text-xs text-gray-500">
              Recommended wait time (helps with 5/24 tracking)
            </p>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label>Note (Optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="e.g., Get this card after 6 months..."
            />
            <p className="text-xs text-gray-500">{note.length}/500</p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={isLoading || !selectedCardId}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Card'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
