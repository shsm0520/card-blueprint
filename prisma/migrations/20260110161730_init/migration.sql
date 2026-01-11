-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "card_type" TEXT NOT NULL,
    "annual_fee" INTEGER NOT NULL,
    "reward_type" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "external_urls" TEXT,
    "last_crawled_at" DATETIME,
    "crawl_status" TEXT,
    "crawl_error" TEXT
);

-- CreateTable
CREATE TABLE "card_trees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "chase_524_status" TEXT NOT NULL,
    "credit_profile" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "card_nodes" (
    "node_id" TEXT NOT NULL PRIMARY KEY,
    "tree_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "parent_node_id" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "card_nodes_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "card_trees" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "card_nodes_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "card_nodes_parent_node_id_fkey" FOREIGN KEY ("parent_node_id") REFERENCES "card_nodes" ("node_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "admin_referrals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "card_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Apply Now',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" DATETIME NOT NULL,
    "external_urls" TEXT,
    "last_crawled_at" DATETIME,
    "crawl_status" TEXT,
    "crawl_error" TEXT,
    CONSTRAINT "admin_referrals_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "cards_slug_key" ON "cards"("slug");
