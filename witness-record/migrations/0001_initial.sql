-- THE WITNESS RECORD — initial schema
-- Source of truth for the database. server/src/db/schema.ts mirrors it for typing.
-- Requires PostgreSQL 13+ (gen_random_uuid() is built in; no extensions needed).


CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('google','microsoft')),
  provider_subject text NOT NULL,
  provider_issuer text NOT NULL,
  email text,
  email_verified boolean NOT NULL DEFAULT false,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
CREATE UNIQUE INDEX users_provider_subject_idx ON users (provider, provider_subject);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  ip_address text,
  user_agent text,
  auth_provider text NOT NULL,
  authenticated_at timestamptz NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  mfa_verified_at timestamptz
);
CREATE UNIQUE INDEX sessions_token_hash_idx ON sessions (token_hash);
CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE admin_mfa (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  secret_encrypted text NOT NULL,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  last_used_step bigint
);

CREATE TABLE invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL,
  label text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  open_count integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX invite_links_token_hash_idx ON invite_links (token_hash);

CREATE TABLE witness_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id),
  root_id uuid NOT NULL,
  version integer NOT NULL DEFAULT 1,
  supersedes_id uuid REFERENCES witness_statements(id),
  invite_id uuid REFERENCES invite_links(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','signed','abandoned')),
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en','es')),
  consent jsonb,
  profile jsonb,
  answers jsonb,
  auth_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz,
  frozen_record jsonb,
  frozen_record_sha256 text,
  pdf_storage_key text,
  pdf_sha256 text,
  pdf_bytes bigint,
  last_error text
);
CREATE UNIQUE INDEX witness_statements_evidence_id_idx ON witness_statements (evidence_id);
CREATE INDEX witness_statements_user_idx ON witness_statements (user_id);
CREATE INDEX witness_statements_root_idx ON witness_statements (root_id);

CREATE TABLE signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id uuid NOT NULL REFERENCES witness_statements(id) UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id),
  session_id uuid NOT NULL,
  legal_name text NOT NULL,
  method text NOT NULL CHECK (method IN ('drawn','typed')),
  typed_value text,
  image_storage_key text,
  image_sha256 text,
  affirmation_text text NOT NULL,
  affirmation_date jsonb NOT NULL,
  declared_accurate boolean NOT NULL,
  consented_to_esign boolean NOT NULL,
  consent_statement text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  record_sha256 text NOT NULL
);

CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id uuid NOT NULL REFERENCES witness_statements(id),
  user_id uuid NOT NULL REFERENCES users(id),
  kind text NOT NULL CHECK (kind IN ('video','document','signature_image','affirmation_pdf')),
  source_type text NOT NULL CHECK (source_type IN ('live_capture','uploaded_file','system_generated')),
  original_filename text,
  declared_mime text,
  detected_mime text,
  size_bytes bigint,
  sha256 text,
  storage_key text NOT NULL,
  status text NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading','complete','rejected','removed_before_signing')),
  scan_status text NOT NULL DEFAULT 'not_configured' CHECK (scan_status IN ('not_configured','pending','clean','infected','error')),
  scan_detail text,
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  description text,
  recording_consent jsonb
);
CREATE INDEX media_assets_statement_idx ON media_assets (statement_id);

CREATE TABLE upload_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id uuid NOT NULL REFERENCES media_assets(id),
  user_id uuid NOT NULL,
  storage_upload_ref text,
  declared_bytes bigint NOT NULL,
  bytes_received bigint NOT NULL DEFAULT 0,
  parts_received integer NOT NULL DEFAULT 0,
  chunk_bytes integer NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','completed','aborted','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE audit_events (
  id bigserial PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_type text NOT NULL CHECK (actor_type IN ('witness','admin','system','anonymous')),
  actor_user_id uuid,
  session_id uuid,
  statement_id uuid,
  media_asset_id uuid,
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  prev_hash text NOT NULL,
  entry_hash text NOT NULL
);
CREATE INDEX audit_events_statement_idx ON audit_events (statement_id);
CREATE INDEX audit_events_actor_idx ON audit_events (actor_user_id);

CREATE TABLE admin_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id uuid NOT NULL REFERENCES witness_statements(id),
  admin_user_id uuid NOT NULL REFERENCES users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  statement_id uuid,
  request_type text NOT NULL CHECK (request_type IN ('access','correction','deletion','withdrawal','other')),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','in_review','resolved','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution_note text,
  handled_by uuid
);

-- ---------------------------------------------------------------------------
-- Tamper-evidence: append-only and immutability triggers.
-- These run at the database level so that neither the application nor an
-- administrator using the application can rewrite testimony or audit history.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION wr_forbid_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'witness_record: % on % is forbidden (append-only table)', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION wr_forbid_change();

CREATE TRIGGER signatures_append_only
  BEFORE UPDATE OR DELETE ON signatures
  FOR EACH ROW EXECUTE FUNCTION wr_forbid_change();

CREATE TRIGGER admin_annotations_append_only
  BEFORE UPDATE OR DELETE ON admin_annotations
  FOR EACH ROW EXECUTE FUNCTION wr_forbid_change();

-- Finalized (signed) statements are frozen. The only permitted transition is
-- draft -> signed (which writes the frozen record) performed in one UPDATE.
CREATE OR REPLACE FUNCTION wr_protect_signed_statement() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'signed' THEN
      RAISE EXCEPTION 'witness_record: signed statement % cannot be deleted', OLD.evidence_id
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'signed' THEN
    RAISE EXCEPTION 'witness_record: signed statement % is immutable; corrections must create a new version', OLD.evidence_id
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF NEW.status = 'signed' AND (NEW.frozen_record IS NULL OR NEW.frozen_record_sha256 IS NULL OR NEW.finalized_at IS NULL) THEN
    RAISE EXCEPTION 'witness_record: a statement cannot be marked signed without a frozen record and digest'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER witness_statements_protect
  BEFORE UPDATE OR DELETE ON witness_statements
  FOR EACH ROW EXECUTE FUNCTION wr_protect_signed_statement();

-- Completed media assets keep their bytes, hash and provenance forever. Only
-- the malware-scan outcome may be recorded after completion.
CREATE OR REPLACE FUNCTION wr_protect_complete_media() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'complete' THEN
      RAISE EXCEPTION 'witness_record: completed media asset % cannot be deleted', OLD.id
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'complete' THEN
    IF NEW.sha256 IS DISTINCT FROM OLD.sha256
       OR NEW.storage_key IS DISTINCT FROM OLD.storage_key
       OR NEW.size_bytes IS DISTINCT FROM OLD.size_bytes
       OR NEW.received_at IS DISTINCT FROM OLD.received_at
       OR NEW.source_type IS DISTINCT FROM OLD.source_type
       OR NEW.kind IS DISTINCT FROM OLD.kind
       OR NEW.statement_id IS DISTINCT FROM OLD.statement_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.original_filename IS DISTINCT FROM OLD.original_filename
       OR NEW.detected_mime IS DISTINCT FROM OLD.detected_mime
       OR NEW.recording_consent IS DISTINCT FROM OLD.recording_consent
       OR (NEW.status <> 'complete' AND NEW.status <> 'removed_before_signing') THEN
      RAISE EXCEPTION 'witness_record: completed media asset % is immutable', OLD.id
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER media_assets_protect
  BEFORE UPDATE OR DELETE ON media_assets
  FOR EACH ROW EXECUTE FUNCTION wr_protect_complete_media();
