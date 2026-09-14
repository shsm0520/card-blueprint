import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PUT } from "../app/api/trees/[id]/nodes/[node_id]/route";
import { NextRequest } from "next/server";

const prisma = new PrismaClient();

async function callPutApi(treeId: string, nodeId: string, body: any, editToken: string) {
  const req = new NextRequest(`http://localhost:3000/api/trees/${treeId}/nodes/${nodeId}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      "x-edit-token": editToken,
    },
    body: JSON.stringify(body),
  });

  const params = Promise.resolve({ id: treeId, node_id: nodeId });
  const res = await PUT(req, { params });
  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  console.log("Testing cycle detection logic on PUT /api/trees/[id]/nodes/[node_id]");

  // Seed / fetch card
  let card = await prisma.card.findFirst({ where: { isActive: true } });
  if (!card) {
    throw new Error("No active card found in database");
  }

  // Create test tree
  const treeId = "test-cycle-tree";
  const editToken = "testpass";
  const editTokenHash = await bcrypt.hash(editToken, 10);

  // Clean up any existing tree with this ID
  await prisma.cardTree.deleteMany({ where: { id: treeId } });

  await prisma.cardTree.create({
    data: {
      id: treeId,
      title: "Test Cycle Tree",
      goal: "cashback",
      chase524Status: "under",
      creditProfile: "3plus",
      ssnStatus: "ssn",
      editTokenHash,
    },
  });

  // Create nodes: Node A (root), Node B (child of A), Node C (child of B)
  await prisma.cardNode.create({
    data: {
      nodeId: "node-A",
      treeId,
      cardId: card.id,
      parentNodeId: null,
    },
  });

  await prisma.cardNode.create({
    data: {
      nodeId: "node-B",
      treeId,
      cardId: card.id,
      parentNodeId: "node-A",
    },
  });

  await prisma.cardNode.create({
    data: {
      nodeId: "node-C",
      treeId,
      cardId: card.id,
      parentNodeId: "node-B",
    },
  });

  console.log("Created hierarchy: Node A -> Node B -> Node C");

  // Test 1: Direct self cycle (A -> A)
  console.log("\n--- Test 1: Direct self cycle (A -> A) ---");
  const res1 = await callPutApi(treeId, "node-A", { parentNodeId: "node-A" }, editToken);
  console.log("Response status:", res1.status, "body:", res1.data);

  // Test 2: Indirect cycle (A -> B) making A child of B when B is descendant of A
  console.log("\n--- Test 2: Indirect cycle (A -> B, where B is child of A) ---");
  const res2 = await callPutApi(treeId, "node-A", { parentNodeId: "node-B" }, editToken);
  console.log("Response status:", res2.status, "body:", res2.data);

  // Test 3: Indirect cycle (A -> C, where C is child of B which is child of A)
  console.log("\n--- Test 3: Indirect cycle (A -> C, where C is descendant of A) ---");
  const res3 = await callPutApi(treeId, "node-A", { parentNodeId: "node-C" }, editToken);
  console.log("Response status:", res3.status, "body:", res3.data);

  // Test 4: Valid parent update (C -> A directly instead of C -> B)
  console.log("\n--- Test 4: Valid update (C -> A) ---");
  const res4 = await callPutApi(treeId, "node-C", { parentNodeId: "node-A" }, editToken);
  console.log("Response status:", res4.status, "body:", res4.data);

  // Clean up
  await prisma.cardTree.deleteMany({ where: { id: treeId } });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
