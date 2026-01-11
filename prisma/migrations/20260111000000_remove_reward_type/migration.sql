-- Migration: Remove reward_type column and merge into tags
-- Step 1: Create a temporary column for new tags
-- Step 2: Merge reward_type into tags JSON array
-- Step 3: Drop reward_type column

-- SQLite doesn't support adding to JSON arrays easily, so we'll use a multi-step approach

-- Create temporary table with new structure
CREATE TABLE "cards_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "card_type" TEXT NOT NULL,
    "annual_fee" INTEGER NOT NULL,
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

-- Copy data, merging reward_type into tags
-- For each row, parse tags array, add reward_type as first element, then stringify
INSERT INTO "cards_new" 
SELECT 
    id,
    slug,
    name,
    issuer,
    card_type,
    annual_fee,
    CASE 
        WHEN tags = '[]' OR tags IS NULL THEN '["' || reward_type || '"]'
        ELSE REPLACE(tags, '[', '["' || reward_type || '",')
    END as tags,
    is_active,
    counts_toward_524,
    created_at,
    updated_at,
    external_urls,
    last_crawled_at,
    crawl_status,
    crawl_error
FROM "cards";

-- Drop old table
DROP TABLE "cards";

-- Rename new table
ALTER TABLE "cards_new" RENAME TO "cards";

-- Recreate indexes
CREATE UNIQUE INDEX "cards_slug_key" ON "cards"("slug");
