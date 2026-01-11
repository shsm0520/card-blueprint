'use client'

import { useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  NodeTypes,
  Position,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import EditableCardNode from './EditableCardNode'
import TreeMetadataEditor from './TreeMetadataEditor'
import AddNodeDialog from './AddNodeDialog'
import TreeSummary from '../tree/TreeSummary'
import { Button } from '@/components/ui/button'
import { Plus, Save } from 'lucide-react'

interface TreeData {
  id: string
  title: string
  goal: string
  chase524Status: string
  creditProfile: string
  note: string
  viewCount: number
  createdAt: string
  updatedAt: string
  nodes: Array<{
    nodeId: string
    cardId: string
    parentNodeId: string | null
    position: number
    note: string
    plannedDate?: string | null
    monthsAfterPrevious?: number | null
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
  }>
}

interface TreeEditorProps {
  tree: TreeData
  editToken: string
  onUpdate: () => void
}

const nodeTypes: NodeTypes = {
  editableCard: EditableCardNode,
}

// Build layout (same as TreeViewer)
// Left-to-right layout with vertical spacing for siblings
function buildLayout(nodes: TreeData['nodes']) {
  const HORIZONTAL_SPACING = 400 // Left to right spacing
  const VERTICAL_SPACING = 250   // Vertical spacing between siblings

  const childrenMap = new Map<string | null, typeof nodes>()
  nodes.forEach((node) => {
    const parentId = node.parentNodeId
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, [])
    }
    childrenMap.get(parentId)!.push(node)
  })

  childrenMap.forEach((children) => {
    children.sort((a, b) => a.position - b.position)
  })

  const positions = new Map<string, { x: number; y: number }>()

  // Recursive layout - returns the bottom y position
  function layoutNode(
    nodeId: string | null,
    depth: number,
    startY: number
  ): number {
    const children = childrenMap.get(nodeId) || []

    if (children.length === 0) {
      return startY
    }

    let currentY = startY
    const childPositions: Array<{ nodeId: string; y: number }> = []

    for (const child of children) {
      const childY = layoutNode(child.nodeId, depth + 1, currentY)
      childPositions.push({ nodeId: child.nodeId, y: currentY })
      currentY = childY + VERTICAL_SPACING
    }

    // Position children at their depth level (left to right)
    childPositions.forEach(({ nodeId, y }) => {
      positions.set(nodeId, {
        x: depth * HORIZONTAL_SPACING,
        y,
      })
    })

    // Return the bottommost y position
    return currentY - VERTICAL_SPACING
  }

  const rootNodes = childrenMap.get(null) || []
  let currentY = 0
  for (const root of rootNodes) {
    const endY = layoutNode(root.nodeId, 1, currentY)  // Start at depth 1 instead of 0
    positions.set(root.nodeId, {
      x: 0,  // Root at x=0
      y: currentY,
    })
    currentY = endY + VERTICAL_SPACING
  }

  return positions
}

export default function TreeEditor({ tree, editToken, onUpdate }: TreeEditorProps) {
  const [showMetadataEditor, setShowMetadataEditor] = useState(false)
  const [showAddNode, setShowAddNode] = useState(false)

  const positions = buildLayout(tree.nodes)

  const initialNodes: Node[] = tree.nodes.map((node) => {
    const pos = positions.get(node.nodeId) || { x: 0, y: 0 }

    return {
      id: node.nodeId,
      type: 'editableCard',
      position: pos,
      data: {
        card: node.card,
        note: node.note,
        plannedDate: node.plannedDate,
        monthsAfterPrevious: node.monthsAfterPrevious,
        parentNodeId: node.parentNodeId,
        treeId: tree.id,
        editToken,
        existingNodes: tree.nodes.map((n) => ({
          nodeId: n.nodeId,
          card: {
            id: n.card.id,
            name: n.card.name,
          },
        })),
        onUpdate: () => {
          // Refetch tree data
          fetchTreeData()
        },
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }
  })

  const initialEdges: Edge[] = tree.nodes
    .filter((node) => node.parentNodeId)
    .map((node) => ({
      id: `${node.parentNodeId}-${node.nodeId}`,
      source: node.parentNodeId!,
      target: node.nodeId,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
    }))

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const fetchTreeData = async () => {
    try {
      const res = await fetch(`/card/api/trees/${tree.id}/`)
      const data = await res.json()
      if (data.success) {
        // Update nodes and edges
        const newPositions = buildLayout(data.data.nodes)
        const newNodes: Node[] = data.data.nodes.map((node: any) => {
          const pos = newPositions.get(node.nodeId) || { x: 0, y: 0 }
          return {
            id: node.nodeId,
            type: 'editableCard',
            position: pos,
            data: {
              card: node.card,
              note: node.note,
              plannedDate: node.plannedDate,
              monthsAfterPrevious: node.monthsAfterPrevious,
              parentNodeId: node.parentNodeId,
              treeId: tree.id,
              editToken,
              existingNodes: data.data.nodes.map((n: any) => ({
                nodeId: n.nodeId,
                card: {
                  id: n.card.id,
                  name: n.card.name,
                },
              })),
              onUpdate: fetchTreeData,
            },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
          }
        })

        const newEdges: Edge[] = data.data.nodes
          .filter((node: any) => node.parentNodeId)
          .map((node: any) => ({
            id: `${node.parentNodeId}-${node.nodeId}`,
            source: node.parentNodeId!,
            target: node.nodeId,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#3b82f6', strokeWidth: 2 },
          }))

        setNodes(newNodes)
        setEdges(newEdges)
      }
    } catch (error) {
      console.error('Failed to fetch tree data:', error)
    }
  }

  return (
    <div>
      {/* Editor Toolbar */}
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            onClick={() => setShowMetadataEditor(true)}
            variant="outline"
            size="sm"
          >
            <Save className="mr-2 h-4 w-4" />
            Edit Details
          </Button>
          <Button
            onClick={() => setShowAddNode(true)}
            variant="default"
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Card
          </Button>
        </div>
        <div className="text-sm text-gray-600">
          Edit Mode • Click nodes to edit or delete
        </div>
      </div>

      {/* React Flow Editor */}
      <div className="flex h-[600px]">
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{
              padding: 0.2,
              minZoom: 0.5,
              maxZoom: 1.5,
            }}
            minZoom={0.3}
            maxZoom={2}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
          >
            <Background color="#e2e8f0" gap={16} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
        <TreeSummary nodes={tree.nodes} />
      </div>

      {/* Metadata Editor Dialog */}
      {showMetadataEditor && (
        <TreeMetadataEditor
          tree={tree}
          editToken={editToken}
          onClose={() => setShowMetadataEditor(false)}
          onUpdate={() => {
            onUpdate()
            setShowMetadataEditor(false)
          }}
        />
      )}

      {/* Add Node Dialog */}
      {showAddNode && (
        <AddNodeDialog
          treeId={tree.id}
          editToken={editToken}
          existingNodes={tree.nodes}
          onClose={() => setShowAddNode(false)}
          onAdd={() => {
            setShowAddNode(false)
            fetchTreeData()
          }}
        />
      )}
    </div>
  )
}
