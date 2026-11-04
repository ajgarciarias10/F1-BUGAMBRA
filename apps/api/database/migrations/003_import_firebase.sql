-- La copia fiel vive en f1_import_test. El archivo del destino conserva los campos
-- sin modelo operativo; ninguna regla de economía debe leerlo.
CREATE TABLE source_document_archive (
  path text PRIMARY KEY,
  seq integer NOT NULL UNIQUE,
  collection_name text NOT NULL,
  data jsonb NOT NULL,
  source_sha256 char(64) NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX source_document_archive_collection_idx ON source_document_archive (collection_name, seq);

ALTER TABLE race_result ALTER COLUMN qualifying_position DROP NOT NULL;
ALTER TABLE race_result ALTER COLUMN season_team_id_at_race DROP NOT NULL;
ALTER TABLE race_result DROP CONSTRAINT race_result_check1;

CREATE FUNCTION validate_imported_race_result() RETURNS trigger AS $$
DECLARE
  expected_season_id uuid;
  related_season_id uuid;
  driver_starts_at integer;
  driver_ends_at integer;
  race_sequence integer;
BEGIN
  SELECT r.season_id, r.sequence INTO expected_season_id, race_sequence
    FROM race_revision rev JOIN race r ON r.id = rev.race_id
    WHERE rev.id = NEW.race_revision_id;
  SELECT season_id, starts_at_sequence, ends_at_sequence
    INTO related_season_id, driver_starts_at, driver_ends_at
    FROM season_driver WHERE id = NEW.season_driver_id;
  IF related_season_id IS DISTINCT FROM expected_season_id
    OR race_sequence < driver_starts_at
    OR (driver_ends_at IS NOT NULL AND race_sequence > driver_ends_at) THEN
    RAISE EXCEPTION 'El piloto no pertenece a la carrera o está fuera de su periodo';
  END IF;
  IF NEW.season_team_id_at_race IS NULL THEN RETURN NEW; END IF;
  SELECT season_id INTO related_season_id FROM season_team WHERE id = NEW.season_team_id_at_race;
  IF related_season_id IS DISTINCT FROM expected_season_id THEN
    RAISE EXCEPTION 'El equipo no pertenece a la temporada de la carrera';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM roster_assignment assignment
    WHERE assignment.season_driver_id = NEW.season_driver_id
      AND assignment.season_team_id = NEW.season_team_id_at_race
      AND assignment.starts_at_sequence <= race_sequence
      AND (assignment.ends_at_sequence IS NULL OR assignment.ends_at_sequence >= race_sequence)
  ) THEN
    RAISE EXCEPTION 'El piloto no pertenecía a este equipo en esta carrera';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER race_result_same_season ON race_result;
CREATE TRIGGER race_result_same_season
  BEFORE INSERT OR UPDATE ON race_result
  FOR EACH ROW EXECUTE FUNCTION validate_imported_race_result();

ALTER TABLE race_revision ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE season_ruleset ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE ledger_entry ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE transfer ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE ledger_entry ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE audit_log ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE ledger_entry DROP CONSTRAINT ledger_entry_amount_check;

ALTER TABLE ledger_entry ADD COLUMN source_path text UNIQUE;
ALTER TABLE ledger_entry ADD COLUMN secuencia integer UNIQUE;
ALTER TABLE transfer ADD COLUMN source_path text UNIQUE;
ALTER TABLE audit_log ADD COLUMN source_path text UNIQUE;
