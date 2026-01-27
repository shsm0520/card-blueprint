"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  NodeTypes,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import CardNode from "./CardNode";
import TreeSummary from "./TreeSummary";

interface TreeViewerProps {
  tree: {
    id: string;
    title: string;
    nodes: Array<{
      nodeId: string;
      cardId: string;
      parentNodeId: string | null;
      position: number;
      note: string;
      plannedDate?: string | null;
      monthsAfterPrevious?: number | null;
      card: {
        id: string;
        slug: string;
        name: string;
        issuer: string;
        cardType: string;
        annualFee: number;
        rewardType: string;
        tags: string[];
      };
    }>;
  };
}

// Custom node types
const nodeTypes: NodeTypes = {
  cardNode: CardNode,
};

/**
 * Build hierarchical layout for tree nodes
 * Top-to-bottom layout with horizontal spacing for siblings
 */
function buildLayout(nodes: TreeViewerProps["tree"]["nodes"]) {
  const VERTICAL_SPACING = 300; // Top to bottom spacing (between levels)
  const HORIZONTAL_SPACING = 350; // Horizontal spacing between siblings

  // Build parent-child map
  const childrenMap = new Map<string | null, typeof nodes>();
  nodes.forEach((node) => {
    const parentId = node.parentNodeId;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(node);
  });

  // Sort children by position
  childrenMap.forEach((children) => {
    children.sort((a, b) => a.position - b.position);
  });

  const positions = new Map<string, { x: number; y: number }>();

  // Recursive layout - returns the rightmost x position
  function layoutNode(
    nodeId: string | null,
    depth: number,
    startX: number
  ): number {
    const children = childrenMap.get(nodeId) || [];

    if (children.length === 0) {
      return startX;
    }

    let currentX = startX;
    const childPositions: Array<{ nodeId: string; x: number }> = [];

    // Layout children
    for (const child of children) {
      const childX = layoutNode(child.nodeId, depth + 1, currentX);
      childPositions.push({ nodeId: child.nodeId, x: currentX });
      currentX = childX + HORIZONTAL_SPACING;
    }

    // Position children at their depth level (top to bottom)
    childPositions.forEach(({ nodeId, x }) => {
      positions.set(nodeId, {
        x,
        y: depth * VERTICAL_SPACING,
      });
    });

    // Return the rightmost x position
    return currentX - HORIZONTAL_SPACING;
  }

  // Start layout from root nodes
  const rootNodes = childrenMap.get(null) || [];
  let currentX = 0;
  for (const root of rootNodes) {
    const endX = layoutNode(root.nodeId, 1, currentX); // Start at depth 1 instead of 0
    positions.set(root.nodeId, {
      x: currentX, // Root at x=currentX
      y: 0, // Root at y=0
    });
    currentX = endX + HORIZONTAL_SPACING;
  }

  return positions;
}

export default function TreeViewer({ tree }: TreeViewerProps) {
  // Build layout
  const positions = useMemo(() => buildLayout(tree.nodes), [tree.nodes]);

  // Convert to React Flow nodes
  const flowNodes: Node[] = useMemo(() => {
    return tree.nodes.map((node) => {
      const pos = positions.get(node.nodeId) || { x: 0, y: 0 };

      return {
        id: node.nodeId,
        type: "cardNode",
        position: pos,
        data: {
          card: node.card,
          note: node.note,
          plannedDate: node.plannedDate,
          monthsAfterPrevious: node.monthsAfterPrevious,
          treeId: tree.id,
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      };
    });
  }, [tree.nodes, tree.id, positions]);

  // Convert to React Flow edges
  const flowEdges: Edge[] = useMemo(() => {
    return tree.nodes
      .filter((node) => node.parentNodeId)
      .map((node) => ({
        id: `${node.parentNodeId}-${node.nodeId}`,
        source: node.parentNodeId!,
        target: node.nodeId,
        type: "smoothstep",
        animated: false,
        style: { stroke: "#94a3b8", strokeWidth: 2 },
      }));
  }, [tree.nodes]);

  const onNodesChange = useCallback(() => {
    // Read-only for public view
  }, []);

  const onEdgesChange = useCallback(() => {
    // Read-only for public view
  }, []);

  return (
    <div className="flex flex-col lg:flex-row h-[500px] sm:h-[600px] lg:h-[600px]">
      <div className="flex-1 h-full">
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
      <div className="hidden lg:block">
        <TreeSummary nodes={tree.nodes} />
      </div>
    </div>
  );
}
