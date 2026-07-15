-- WebAuthn / passkey credential storage.
-- Public keys are stored server-side; challenges are short-lived and one-time.

CREATE TABLE IF NOT EXISTS auth_webauthn_credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT,
  backed_up BOOLEAN NOT NULL DEFAULT false,
  device_type TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP(3),
  CONSTRAINT auth_webauthn_credentials_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS auth_webauthn_credentials_user_id_idx
  ON auth_webauthn_credentials(user_id);

CREATE INDEX IF NOT EXISTS auth_webauthn_credentials_last_used_at_idx
  ON auth_webauthn_credentials(last_used_at);

CREATE TABLE IF NOT EXISTS auth_webauthn_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT,
  challenge TEXT NOT NULL,
  kind TEXT NOT NULL,
  expires_at TIMESTAMP(3) NOT NULL,
  used_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT auth_webauthn_challenges_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS auth_webauthn_challenges_user_kind_idx
  ON auth_webauthn_challenges(user_id, kind, expires_at);

CREATE INDEX IF NOT EXISTS auth_webauthn_challenges_email_kind_idx
  ON auth_webauthn_challenges(email, kind, expires_at);

CREATE INDEX IF NOT EXISTS auth_webauthn_challenges_used_at_idx
  ON auth_webauthn_challenges(used_at);
