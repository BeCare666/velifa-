-- 001 — Schéma de référence (remplace les ALTER exécutés au démarrage et le schéma Prisma désynchronisé).
-- Idempotent : crée tout sur une base vide ; sur la base existante, n'ajoute que ce qui manque.
-- Syntaxe TiDB (ADD COLUMN / CREATE INDEX ... IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS analyses (
  id                   VARCHAR(191)  NOT NULL,
  url_site             VARCHAR(2048) NOT NULL,
  url_hash             VARCHAR(64)   NOT NULL,
  email_client         VARCHAR(255)  NOT NULL,
  status               ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  score_performance    INT           NULL,
  score_accessibility  INT           NULL,
  score_seo            INT           NULL,
  score_best_practices INT           NULL,
  lcp_mobile           DOUBLE        NULL,
  cls_mobile           DOUBLE        NULL,
  tbt_mobile           DOUBLE        NULL,
  fcp_mobile           DOUBLE        NULL,
  ttfb_mobile          DOUBLE        NULL,
  lcp_desktop          DOUBLE        NULL,
  cls_desktop          DOUBLE        NULL,
  tbt_desktop          DOUBLE        NULL,
  fcp_desktop          DOUBLE        NULL,
  ttfb_desktop         DOUBLE        NULL,
  images_to_optimize   JSON          NULL,
  blocking_scripts     JSON          NULL,
  unused_resources     JSON          NULL,
  report_json          JSON          NULL,
  screenshot_url       TEXT          NULL,
  cloudinary_public_id VARCHAR(255)  NULL,
  whatsapp_link        TEXT          NULL,
  report_url           TEXT          NULL,
  locale               VARCHAR(5)    NOT NULL DEFAULT 'fr',
  source               VARCHAR(50)   NOT NULL DEFAULT 'web',
  ip_address           VARCHAR(45)   NULL,
  user_agent           TEXT          NULL,
  deleted_at           DATETIME(3)   NULL,
  anonymized_at        DATETIME(3)   NULL,
  error_message        TEXT          NULL,
  created_at           DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at           DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  completed_at         DATETIME(3)   NULL,
  failed_at            DATETIME(3)   NULL,
  PRIMARY KEY (id),
  KEY analyses_url_hash_idx (url_hash),
  KEY analyses_status_idx (status),
  KEY analyses_created_at_idx (created_at),
  KEY analyses_email_client_idx (email_client),
  KEY analyses_url_hash_created_at_idx (url_hash, created_at),
  KEY analyses_deleted_at_idx (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Colonnes ajoutées après la création initiale de la table
-- (clerk_user_id + son index : repris à l'identique de l'ancien script manuel 001_add_clerk_user_id.sql)
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS clerk_user_id VARCHAR(64) NULL;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS technologies JSON NULL;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS platform VARCHAR(40) NULL;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS field_data JSON NULL;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS recommendations JSON NULL;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS site_checks JSON NULL;

-- « Mes audits », limites quotidiennes, cache par propriétaire
CREATE INDEX IF NOT EXISTS idx_analyses_clerk_user_id ON analyses (clerk_user_id);

CREATE TABLE IF NOT EXISTS users (
  id                    VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  clerk_user_id         VARCHAR(255) NOT NULL,
  subscription_plan     VARCHAR(20)  NULL,
  subscription_status   VARCHAR(20)  NULL,
  lemon_subscription_id VARCHAR(100) NULL,
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clerk_user_id (clerk_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS admin_notifications (
  id          VARCHAR(36) NOT NULL,
  type        VARCHAR(50) NOT NULL DEFAULT 'info',
  message     TEXT        NOT NULL,
  read_status BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Prospects (audit en lot, admin) : une ligne par boutique, liée à son audit
CREATE TABLE IF NOT EXISTS prospects (
  id          VARCHAR(36)   NOT NULL,
  batch_id    VARCHAR(36)   NOT NULL,
  url_site    VARCHAR(2048) NOT NULL,
  url_hash    CHAR(64)      NOT NULL,
  name        VARCHAR(255)  NULL,
  phone       VARCHAR(20)   NULL,
  country     CHAR(2)       NULL,
  locale      VARCHAR(5)    NOT NULL,
  analysis_id VARCHAR(191)  NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_prospects_url_hash (url_hash),
  KEY idx_prospects_batch (batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Leads : demandes « Je veux corriger » envoyées depuis un rapport
CREATE TABLE IF NOT EXISTS leads (
  id            VARCHAR(36)   NOT NULL,
  analysis_id   VARCHAR(191)  NOT NULL,
  url_site      VARCHAR(2048) NOT NULL,
  name          VARCHAR(120)  NULL,
  email         VARCHAR(255)  NULL,
  phone         VARCHAR(20)   NULL,
  message       TEXT          NULL,
  locale        VARCHAR(5)    NOT NULL,
  clerk_user_id VARCHAR(255)  NULL,
  ip_address    VARCHAR(64)   NULL,
  status        VARCHAR(20)   NOT NULL DEFAULT 'new',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_leads_analysis (analysis_id),
  KEY idx_leads_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
