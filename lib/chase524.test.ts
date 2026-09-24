import {
  isNodeIn24MonthWindow,
  countNodesIn24MonthWindow,
  validateChase524Status,
} from "./chase524";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log("Running 5/24 validation tests...");

// 1. Target date null / unspecified: conservative inclusion
{
  assert(
    isNodeIn24MonthWindow("2025-01-01", null) === true,
    "Target date null should include node"
  );
  assert(
    isNodeIn24MonthWindow(null, "2025-01-01") === true,
    "Node date null should include node"
  );
}

// 2. Upper bound (Future card exclusion)
{
  const targetDate = new Date("2025-06-01");
  const futureDate = new Date("2025-07-01"); // After target date
  const pastDate = new Date("2025-05-01"); // Before target date

  assert(
    isNodeIn24MonthWindow(futureDate, targetDate) === false,
    "Cards planned AFTER target date must be excluded from 5/24 count"
  );
  assert(
    isNodeIn24MonthWindow(pastDate, targetDate) === true,
    "Cards planned BEFORE target date (within 24 months) must be included"
  );
}

// 3. Exact target date (Same date handling)
{
  const targetDate = new Date("2025-06-01");
  const sameDate = new Date("2025-06-01");

  assert(
    isNodeIn24MonthWindow(sameDate, targetDate) === true,
    "Cards planned on exact same date as target date must be included"
  );
}

// 4. Lower bound (24-month boundary)
{
  const targetDate = new Date("2025-06-01");

  // 24 months prior is 2023-06-01
  const exact24MonthsAgo = new Date("2023-06-01");
  const olderThan24Months = new Date("2023-05-31");
  const newerThan24Months = new Date("2023-06-02");

  assert(
    isNodeIn24MonthWindow(exact24MonthsAgo, targetDate) === true,
    "Cards planned exactly 24 months prior must be included (lower bound)"
  );
  assert(
    isNodeIn24MonthWindow(newerThan24Months, targetDate) === true,
    "Cards planned within 24 months must be included"
  );
  assert(
    isNodeIn24MonthWindow(olderThan24Months, targetDate) === false,
    "Cards planned >24 months prior must be excluded"
  );
}

// 5. countNodesIn24MonthWindow test suite
{
  const targetDate = new Date("2025-06-01");
  const existingNodes = [
    { nodeId: "node-1", countsToward524: true, plannedDate: "2024-01-01" }, // In window
    { nodeId: "node-2", countsToward524: true, plannedDate: "2024-06-01" }, // In window
    { nodeId: "node-3", countsToward524: true, plannedDate: "2025-01-01" }, // In window
    { nodeId: "node-4", countsToward524: true, plannedDate: "2025-05-01" }, // In window
    { nodeId: "node-5", countsToward524: true, plannedDate: "2025-08-01" }, // FUTURE -> Excluded!
    { nodeId: "node-6", countsToward524: false, plannedDate: "2024-03-01" }, // Business card -> Excluded!
    { nodeId: "node-7", countsToward524: true, plannedDate: "2022-01-01" }, // >24 months ago -> Excluded!
  ];

  const count = countNodesIn24MonthWindow(existingNodes, targetDate);
  assert(
    count === 4,
    `Expected 4 cards in 24-month window, but got ${count}`
  );

  // Test excludeNodeId for update scenario (PUT)
  const countWithExclusion = countNodesIn24MonthWindow(
    existingNodes,
    targetDate,
    "node-1"
  );
  assert(
    countWithExclusion === 3,
    `Expected 3 cards when node-1 is excluded, but got ${countWithExclusion}`
  );
}

// 6. validateChase524Status validation logic
{
  const targetDate = new Date("2025-06-01");
  const existingNodes = [
    { nodeId: "1", countsToward524: true, plannedDate: "2024-01-01" },
    { nodeId: "2", countsToward524: true, plannedDate: "2024-02-01" },
    { nodeId: "3", countsToward524: true, plannedDate: "2024-03-01" },
    { nodeId: "4", countsToward524: true, plannedDate: "2024-04-01" },
    { nodeId: "5", countsToward524: true, plannedDate: "2024-05-01" },
    { nodeId: "6", countsToward524: true, plannedDate: "2026-01-01" }, // Future card!
  ];

  // Adding Chase card at 2025-06-01:
  // Cards in window: nodes 1, 2, 3, 4, 5 (total 5). Node 6 is future and excluded.
  const result = validateChase524Status({
    chase524Status: "under",
    targetCardIssuer: "Chase",
    targetCardCountsToward524: true,
    targetPlannedDate: targetDate,
    existingNodes,
  });

  assert(
    result.valid === false,
    "Should block Chase card when 5 cards exist in past 24 months"
  );

  // If target date is moved to 2026-02-01 (so nodes 1,2,3,4,5 are >24 months ago):
  const futureTargetDate = new Date("2026-06-01");
  const resultFuture = validateChase524Status({
    chase524Status: "under",
    targetCardIssuer: "Chase",
    targetCardCountsToward524: true,
    targetPlannedDate: futureTargetDate,
    existingNodes,
  });

  // At 2026-06-01, nodes 1,2,3,4,5 are older than 24 months (before 2024-06-01). Only node 6 (2026-01-01) is in window.
  assert(
    resultFuture.valid === true,
    "Should allow Chase card when earlier cards fall outside 24-month window"
  );
}

console.log("All 5/24 validation unit tests passed successfully!");
