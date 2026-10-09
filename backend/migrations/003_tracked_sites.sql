-- 003 — Sites suivis (remplace l'ancien suivi en localStorage) : personnels ou rattachés à un espace agence.
-- scope = 'user:<clerk_user_id>' (personnel) ou '<workspace_id>' ; un site n'apparaît qu'une fois par scope.
-- owner_clerk_user_id = titulaire de l'abonnement dont la limite s'applique (propriétaire de l'espace).

CREATE TABLE IF NOT EXISTS tracked_sites (
  id                  VARCHAR(36)   NOT NULL,
  scope               VARCHAR(300)  NOT NULL,
  workspace_id        VARCHAR(36)   NULL,
  owner_clerk_user_id VARCHAR(255)  NOT NULL,
  url_site            VARCHAR(2048) NOT NULL,
  url_hash            CHAR(64)      NOT NULL,
  label               VARCHAR(120)  NULL,
  created_by          VARCHAR(255)  NOT NULL,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tracked_sites_scope_url (scope, url_hash),
  KEY idx_tracked_sites_owner (owner_clerk_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
