-- Marketplace creator payout readiness.
-- Keeps Stripe Connect state separate from buyer billing so creator payouts can
-- evolve without overloading the core User subscription model.

CREATE TABLE IF NOT EXISTS marketplace_creator_payout_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  charges_enabled BOOLEAN NOT NULL DEFAULT false,
  payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  details_submitted BOOLEAN NOT NULL DEFAULT false,
  default_currency TEXT,
  country TEXT,
  email TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT marketplace_creator_payout_accounts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS marketplace_creator_payout_accounts_user_status_idx
  ON marketplace_creator_payout_accounts(user_id, payouts_enabled, charges_enabled);

