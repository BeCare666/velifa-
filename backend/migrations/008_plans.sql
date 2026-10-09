-- 008 — Plans et prix (USD), modifiables par l'admin dans le backoffice (ROADMAP 2.7).
-- Valeurs initiales = grille proposée en 4.2 (docs/commercial/grille-prix.md), à valider par le propriétaire.
-- Les fonctions réservées au plan Business (audits programmés, PDF, widget, API) restent définies dans le code.

CREATE TABLE IF NOT EXISTS plans (
  code                  VARCHAR(20)  NOT NULL,
  price_monthly_cents   INT          NOT NULL DEFAULT 0,
  price_yearly_cents    INT          NULL,
  currency              CHAR(3)      NOT NULL DEFAULT 'USD',
  lemon_variant_monthly VARCHAR(32)  NULL,
  lemon_variant_yearly  VARCHAR(32)  NULL,
  site_limit            INT          NOT NULL DEFAULT 1,
  api_daily_limit       INT          NOT NULL DEFAULT 0,
  widget_daily_limit    INT          NOT NULL DEFAULT 0,
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Valeurs initiales (n'écrase jamais une valeur modifiée par l'admin)
INSERT IGNORE INTO plans (code, price_monthly_cents, price_yearly_cents, site_limit, api_daily_limit, widget_daily_limit) VALUES
  ('free',     0,    NULL,  1,  0,  0),
  ('pro',      2900, 26100, 5,  0,  0),
  ('business', 5900, 53100, 30, 50, 50);
