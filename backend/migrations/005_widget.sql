-- 005 — Widget d'audit intégrable sur le site d'une agence (offre B).
-- widget_key : clé publique du widget ; widget_origins : domaines autorisés (JSON, ex. ["https://agence.ae"]).

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS widget_key CHAR(32) NULL;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS widget_origins TEXT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_workspaces_widget_key ON workspaces (widget_key);

-- Prospects captés par le widget d'une agence (distincts des prospects VELIFA de l'admin)
CREATE TABLE IF NOT EXISTS workspace_prospects (
  id           VARCHAR(36)   NOT NULL,
  workspace_id VARCHAR(36)   NOT NULL,
  url_site     VARCHAR(2048) NOT NULL,
  name         VARCHAR(120)  NULL,
  email        VARCHAR(255)  NULL,
  phone        VARCHAR(20)   NULL,
  analysis_id  VARCHAR(191)  NOT NULL,
  origin       VARCHAR(255)  NOT NULL,
  ip_address   VARCHAR(64)   NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_workspace_prospects_ws (workspace_id, created_at),
  KEY idx_workspace_prospects_analysis (analysis_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
