-- Migration: create community_themes table for storing per-community theme data
CREATE TABLE IF NOT EXISTS community_themes (
  community_id bigint PRIMARY KEY,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_community_themes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_community_themes_ts
BEFORE UPDATE ON community_themes
FOR EACH ROW EXECUTE PROCEDURE update_community_themes_timestamp();
