'use client'

import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  NodeTypes,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import CardNode from './CardNode'
import TreeSummary from './TreeSummary'

interface TreeViewerProps {
  tree: {
    id: string
    title: string
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
}

// Custom node types
const nodeTypes: NodeTypes = {
  cardNode: CardNode,
}

/**
 * Build hierarchical layout for tree nodes
 * Left-to-right layout with vertical spacing for siblings
 */
function buildLayout(nodes: TreeViewerProps['tree']['nodes']) {
  const HORIZONTAL_SPACING = 400 // Left to right spacing
  const VERTICAL_SPACING = 250   // Vertical spacing between siblings

  // Build parent-child map
  const childrenMap = new Map<string | null, typeof nodes>()
  nodes.forEach((node) => {
    const parentId = node.parentNodeId
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, [])
    }
    childrenMap.get(parentId)!.push(node)
  })

  // Sort children by position
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

    // Layout children
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

  // Start layout from root nodes
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

export default function TreeViewer({ tree }: TreeViewerProps) {
  // Build layout
  const positions = useMemo(() => buildLayout(tree.nodes), [tree.nodes])

  // Convert to React Flow nodes
  const flowNodes: Node[] = useMemo(() => {
    return tree.nodes.map((node) => {
      const pos = positions.get(node.nodeId) || { x: 0, y: 0 }

      return {
        id: node.nodeId,
        type: 'cardNode',
        position: pos,
        data: {
          card: node.card,
          note: node.note,
          plannedDate: node.plannedDate,
          monthsAfterPrevious: node.monthsAfterPrevious,
          treeId: tree.id,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      }
    })
  }, [tree.nodes, tree.id, positions])

  // Convert to React Flow edges
  const flowEdges: Edge[] = useMemo(() => {
    return tree.nodes
      .filter((node) => node.parentNodeId)
      .map((node) => ({
        id: `${node.parentNodeId}-${node.nodeId}`,
        source: node.parentNodeId!,
        target: node.nodeId,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
      }))
  }, [tree.nodes])

  const onNodesChange = useCallback(() => {
    // Read-only for public view
  }, [])

  const onEdgesChange = useCallback(() => {
    // Read-only for public view
  }, [])

  return (
    <div className="flex h-[600px]">
      <div className="flex-1">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
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
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnScroll
          zoomOnScroll
          preventScrolling={false}
        >
          <Background color="#e2e8f0" gap={16} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <TreeSummary nodes={tree.nodes} />
    </div>
  )
}
