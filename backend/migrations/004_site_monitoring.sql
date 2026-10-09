-- 004 — Audits programmés et alertes par site suivi (offre B, plan Business).
-- schedule : 'off' | 'daily' | 'weekly' ; alert_threshold : score sous lequel une alerte email est envoyée.

ALTER TABLE tracked_sites ADD COLUMN IF NOT EXISTS schedule VARCHAR(10) NOT NULL DEFAULT 'off';
ALTER TABLE tracked_sites ADD COLUMN IF NOT EXISTS alert_threshold INT NULL;
ALTER TABLE tracked_sites ADD COLUMN IF NOT EXISTS locale VARCHAR(5) NOT NULL DEFAULT 'en';
ALTER TABLE tracked_sites ADD COLUMN IF NOT EXISTS last_scheduled_at DATETIME NULL;
ALTER TABLE tracked_sites ADD COLUMN IF NOT EXISTS last_score INT NULL;
ALTER TABLE tracked_sites ADD COLUMN IF NOT EXISTS last_analysis_id VARCHAR(191) NULL;
ALTER TABLE tracked_sites ADD COLUMN IF NOT EXISTS last_alert_at DATETIME NULL;

CREATE INDEX IF NOT EXISTS idx_tracked_sites_schedule ON tracked_sites (schedule, last_scheduled_at);
