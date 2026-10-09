-- 007 — Préférences de notification par utilisateur (respectées par le worker et les alertes).

ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_reports BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_alerts BOOLEAN NOT NULL DEFAULT TRUE;
