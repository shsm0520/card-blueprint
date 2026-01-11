'use client'

import { memo, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { CreditCard, Edit, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import EditNodeDialog from './EditNodeDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface EditableCardNodeProps {
  id: string
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
    parentNodeId?: string | null
    treeId: string
    editToken: string
    existingNodes: Array<{
      nodeId: string
      card: {
        id: string
        name: string
      }
    }>
    onUpdate: () => void
  }
}

function EditableCardNode({ data, id }: EditableCardNodeProps) {
  const { card, note, plannedDate, monthsAfterPrevious, parentNodeId, treeId, editToken, existingNodes, onUpdate } = data
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const res = await fetch(`/card/api/trees/${treeId}/nodes/${id}`, {
        method: 'DELETE',
        headers: {
          'X-Edit-Token': editToken,
        },
      })

      const responseData = await res.json()

      if (!responseData.success) {
        throw new Error(responseData.error || 'Failed to delete node')
      }

      onUpdate()
    } catch (error) {
      console.error('Failed to delete node:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete node')
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <div className="relative z-10">
      <Handle type="target" position={Position.Left} className="w-3 h-3" />

      <div className="w-80 bg-white border-2 border-blue-300 rounded-lg shadow-lg hover:shadow-xl transition-shadow relative z-10">
        {/* Edit/Delete Buttons */}
        <div className="absolute -top-2 -right-2 flex gap-1 z-20">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 w-7 p-0 rounded-full shadow-md"
            onClick={() => setShowEditDialog(true)}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 w-7 p-0 rounded-full shadow-md"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

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

          {note && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-gray-700">
              <p className="leading-relaxed">{note}</p>
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3" />

      {/* Edit Dialog */}
      {showEditDialog && (
        <EditNodeDialog
          nodeId={id}
          treeId={treeId}
          editToken={editToken}
          currentNote={note}
          currentPlannedDate={plannedDate}
          currentMonthsAfterPrevious={monthsAfterPrevious}
          currentParentNodeId={parentNodeId}
          cardName={card.name}
          existingNodes={existingNodes}
          onClose={() => setShowEditDialog(false)}
          onUpdate={() => {
            setShowEditDialog(false)
            onUpdate()
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Card?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{card.name}</strong> from
              your tree? This will also remove all cards below it in the tree.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default memo(EditableCardNode)
