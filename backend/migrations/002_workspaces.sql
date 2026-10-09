-- 002 — Espaces agence (offre B) : marque (nom, logo, couleur, langue) et membres.

CREATE TABLE IF NOT EXISTS workspaces (
  id                  VARCHAR(36)   NOT NULL,
  name                VARCHAR(80)   NOT NULL,
  logo_url            VARCHAR(2048) NULL,
  brand_color         CHAR(7)       NOT NULL DEFAULT '#D4AF37',
  default_locale      VARCHAR(5)    NOT NULL DEFAULT 'ar',
  owner_clerk_user_id VARCHAR(255)  NOT NULL,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_workspaces_owner (owner_clerk_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id  VARCHAR(36)  NOT NULL,
  clerk_user_id VARCHAR(255) NOT NULL,
  role          VARCHAR(10)  NOT NULL DEFAULT 'member',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, clerk_user_id),
  KEY idx_workspace_members_user (clerk_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
