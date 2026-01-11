-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_card_nodes" (
    "node_id" TEXT NOT NULL PRIMARY KEY,
    "tree_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "parent_node_id" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "planned_date" DATETIME,
    "months_after_previous" INTEGER,
    "counts_toward_524" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "card_nodes_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "card_trees" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "card_nodes_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "card_nodes_parent_node_id_fkey" FOREIGN KEY ("parent_node_id") REFERENCES "card_nodes" ("node_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_card_nodes" ("card_id", "months_after_previous", "node_id", "note", "parent_node_id", "planned_date", "position", "tree_id") SELECT "card_id", "months_after_previous", "node_id", "note", "parent_node_id", "planned_date", "position", "tree_id" FROM "card_nodes";
DROP TABLE "card_nodes";
ALTER TABLE "new_card_nodes" RENAME TO "card_nodes";
CREATE TABLE "new_cards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "card_type" TEXT NOT NULL,
    "annual_fee" INTEGER NOT NULL,
    "reward_type" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "counts_toward_524" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "external_urls" TEXT,
    "last_crawled_at" DATETIME,
    "crawl_status" TEXT,
    "crawl_error" TEXT
);
INSERT INTO "new_cards" ("annual_fee", "card_type", "crawl_error", "crawl_status", "created_at", "external_urls", "id", "is_active", "issuer", "last_crawled_at", "name", "reward_type", "slug", "tags", "updated_at") SELECT "annual_fee", "card_type", "crawl_error", "crawl_status", "created_at", "external_urls", "id", "is_active", "issuer", "last_crawled_at", "name", "reward_type", "slug", "tags", "updated_at" FROM "cards";
DROP TABLE "cards";
ALTER TABLE "new_cards" RENAME TO "cards";
CREATE UNIQUE INDEX "cards_slug_key" ON "cards"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
