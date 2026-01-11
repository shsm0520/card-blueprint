-- AlterTable
ALTER TABLE "card_nodes" ADD COLUMN "months_after_previous" INTEGER;
ALTER TABLE "card_nodes" ADD COLUMN "planned_date" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_card_trees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "chase_524_status" TEXT NOT NULL,
    "credit_profile" TEXT NOT NULL,
    "ssn_status" TEXT NOT NULL DEFAULT 'ssn',
    "note" TEXT NOT NULL DEFAULT '',
    "edit_token_hash" TEXT NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "external_urls" TEXT,
    "last_crawled_at" DATETIME,
    "crawl_status" TEXT,
    "crawl_error" TEXT
);
INSERT INTO "new_card_trees" ("chase_524_status", "crawl_error", "crawl_status", "created_at", "credit_profile", "edit_token_hash", "external_urls", "goal", "id", "last_crawled_at", "note", "title", "updated_at", "view_count") SELECT "chase_524_status", "crawl_error", "crawl_status", "created_at", "credit_profile", "edit_token_hash", "external_urls", "goal", "id", "last_crawled_at", "note", "title", "updated_at", "view_count" FROM "card_trees";
DROP TABLE "card_trees";
ALTER TABLE "new_card_trees" RENAME TO "card_trees";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
