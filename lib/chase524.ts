export interface CardNode524Input {
  nodeId?: string;
  countsToward524: boolean;
  plannedDate?: Date | string | null;
}

/**
 * Calculates whether a node falls within the 24-month window relative to targetPlannedDate.
 *
 * Boundary and date rules:
 * - If targetPlannedDate is null/undefined: conservatively include node.
 * - If nodePlannedDate is null/undefined: conservatively include node (unspecified date).
 * - Upper bound: nodeDate <= targetPlannedDate (cards planned AFTER target date are excluded).
 * - Lower bound: nodeDate >= twentyFourMonthsAgo (24-month boundary: 24 months before target date).
 * - Same date handling: cards planned on the exact same date as targetPlannedDate are included.
 */
export function isNodeIn24MonthWindow(
  nodePlannedDate: Date | string | null | undefined,
  targetPlannedDate: Date | null | undefined
): boolean {
  if (!targetPlannedDate) {
    return true;
  }

  if (!nodePlannedDate) {
    return true;
  }

  const nodeDate = new Date(nodePlannedDate);
  const targetDate = new Date(targetPlannedDate);

  const twentyFourMonthsAgo = new Date(targetDate);
  twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24);

  return nodeDate >= twentyFourMonthsAgo && nodeDate <= targetDate;
}

/**
 * Counts existing nodes that fall within the 24-month window relative to targetPlannedDate.
 */
export function countNodesIn24MonthWindow(
  nodes: CardNode524Input[],
  targetPlannedDate: Date | null | undefined,
  excludeNodeId?: string | null
): number {
  return nodes.filter((node) => {
    if (excludeNodeId && node.nodeId === excludeNodeId) {
      return false;
    }
    if (!node.countsToward524) {
      return false;
    }
    return isNodeIn24MonthWindow(node.plannedDate, targetPlannedDate);
  }).length;
}

/**
 * Validates 5/24 status when creating or updating a node in a tree.
 */
export function validateChase524Status({
  chase524Status,
  targetCardIssuer,
  targetCardCountsToward524,
  targetPlannedDate,
  existingNodes,
  currentNodeId,
}: {
  chase524Status: string;
  targetCardIssuer: string;
  targetCardCountsToward524: boolean;
  targetPlannedDate: Date | null | undefined;
  existingNodes: CardNode524Input[];
  currentNodeId?: string | null;
}): { valid: boolean; count: number; error?: string } {
  if (chase524Status !== "under") {
    return { valid: true, count: 0 };
  }

  if (!targetCardCountsToward524) {
    return { valid: true, count: 0 };
  }

  const count = countNodesIn24MonthWindow(
    existingNodes,
    targetPlannedDate,
    currentNodeId
  );

  if (targetCardIssuer === "Chase" && count >= 5) {
    return {
      valid: false,
      count,
      error: `5/24 Rule Violation: You already have ${count} cards in the last 24 months. Chase cards require being under 5/24.`,
    };
  }

  return { valid: true, count };
}
