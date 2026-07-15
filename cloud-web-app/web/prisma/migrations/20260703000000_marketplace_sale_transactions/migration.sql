-- Real marketplace sale ledger (replaces the in-code simulation formerly in
-- lib/marketplace/payouts.ts#getCreatorEarningsSummary).
--
-- Follows the same "raw SQL table outside the Prisma schema" convention used by
-- marketplace_creator_payout_accounts (see 20260512032000_marketplace_creator_connect),
-- accessed via typed $queryRaw/$executeRaw helpers in lib/marketplace/transactions.ts.
--
-- Escrow model: every sale is inserted with status = 'pending' and
-- escrow_release_at = createdAt + 14 days (chargeback protection window, see
-- CLAUDE_AETHEL_UX_MONETIZATION_ALIGNMENT §7.1/§7.4). A transaction is considered
-- part of the creator's "available" balance once escrow_release_at <= now() AND
-- status is still 'pending' (auto-classified at read time — no cron dependency
-- for correctness; an optional worker MAY flip status to 'cleared' for audit
-- clarity, see lib/marketplace/transactions.ts#releaseEligibleEscrow).

CREATE TABLE IF NOT EXISTS marketplace_sale_transactions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  item_title TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  creator_cents INTEGER NOT NULL,
  platform_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_transfer_id TEXT,
  -- pending | cleared | disputed | refunded | failed
  status TEXT NOT NULL DEFAULT 'pending',
  escrow_release_at TIMESTAMP(3) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT marketplace_sale_transactions_item_fkey
    FOREIGN KEY (item_id) REFERENCES "MarketplaceItem"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT marketplace_sale_transactions_buyer_fkey
    FOREIGN KEY (buyer_id) REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT marketplace_sale_transactions_creator_fkey
    FOREIGN KEY (creator_id) REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS marketplace_sale_transactions_creator_status_idx
  ON marketplace_sale_transactions(creator_id, status);

CREATE INDEX IF NOT EXISTS marketplace_sale_transactions_creator_created_idx
  ON marketplace_sale_transactions(creator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS marketplace_sale_transactions_escrow_idx
  ON marketplace_sale_transactions(status, escrow_release_at);

CREATE INDEX IF NOT EXISTS marketplace_sale_transactions_buyer_idx
  ON marketplace_sale_transactions(buyer_id);
