-- 009 — Installations des applications marketplaces (Salla, puis Zid) — ROADMAP 3.2 / 3.3.
-- Jetons d'accès chiffrés (AES-256-GCM, clé MARKETPLACE_TOKEN_KEY) ; supprimés à la désinstallation.

CREATE TABLE IF NOT EXISTS marketplace_installations (
  id                  VARCHAR(36)   NOT NULL,
  platform            VARCHAR(10)   NOT NULL,
  merchant_id         VARCHAR(32)   NOT NULL,
  status              VARCHAR(12)   NOT NULL DEFAULT 'installed',
  store_name          VARCHAR(255)  NULL,
  store_domain        VARCHAR(2048) NULL,
  access_token_enc    TEXT          NULL,
  refresh_token_enc   TEXT          NULL,
  token_expires_at    DATETIME      NULL,
  scope               VARCHAR(1000) NULL,
  tracked_site_id     VARCHAR(36)   NULL,
  installed_at        DATETIME      NULL,
  uninstalled_at      DATETIME      NULL,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_marketplace_platform_merchant (platform, merchant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
