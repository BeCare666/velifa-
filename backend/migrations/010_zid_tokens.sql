-- 010 — Zid : deux jetons par marchand (documentation OAuth Zid) :
--   access_token  → en-tête X-Manager-Token ; authorization → en-tête Authorization: Bearer.
-- access_token_enc (009) stocke le premier ; auth_token_enc stocke le second (chiffré, AES-256-GCM).

ALTER TABLE marketplace_installations ADD COLUMN IF NOT EXISTS auth_token_enc TEXT NULL;
