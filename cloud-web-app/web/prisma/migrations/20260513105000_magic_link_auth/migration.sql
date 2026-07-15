-- One-time email magic links for passwordless login.
-- Tokens are stored as SHA-256 hashes, expire quickly, and are consumed once.

CREATE TABLE IF NOT EXISTS auth_magic_link_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  request_ip TEXT,
  user_agent TEXT,
  expires_at TIMESTAMP(3) NOT NULL,
  used_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT auth_magic_link_tokens_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS auth_magic_link_tokens_email_idx
  ON auth_magic_link_tokens(email);

CREATE INDEX IF NOT EXISTS auth_magic_link_tokens_user_id_idx
  ON auth_magic_link_tokens(user_id);

CREATE INDEX IF NOT EXISTS auth_magic_link_tokens_expires_at_idx
  ON auth_magic_link_tokens(expires_at);

CREATE INDEX IF NOT EXISTS auth_magic_link_tokens_used_at_idx
  ON auth_magic_link_tokens(used_at);
