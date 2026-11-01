-- Uploads may travel through the server (proxy) or go straight from the
-- browser to the private bucket via presigned multipart parts (direct).
ALTER TABLE upload_sessions ADD COLUMN mode text NOT NULL DEFAULT 'proxy' CHECK (mode IN ('proxy','direct'));
