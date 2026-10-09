-- 006 — Clés API (API publique v1, plan Business). Seule l'empreinte SHA-256 de la clé est stockée.

CREATE TABLE IF NOT EXISTS api_keys (
  id                  VARCHAR(36)  NOT NULL,
  owner_clerk_user_id VARCHAR(255) NOT NULL,
  name                VARCHAR(80)  NOT NULL,
  prefix              VARCHAR(16)  NOT NULL,
  key_hash            CHAR(64)     NOT NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at        DATETIME     NULL,
  revoked_at          DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_api_keys_hash (key_hash),
  KEY idx_api_keys_owner (owner_clerk_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Compteur quotidien d'audits lancés par l'API (par titulaire)
CREATE INDEX IF NOT EXISTS idx_analyses_source_user ON analyses (source, clerk_user_id, created_at);
