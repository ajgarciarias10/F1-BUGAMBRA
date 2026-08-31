CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE user_role AS ENUM ('admin', 'team_manager', 'driver', 'viewer');
CREATE TYPE season_status AS ENUM ('draft', 'active', 'completed', 'archived');
CREATE TYPE ruleset_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE race_status AS ENUM ('draft', 'validated', 'finalized', 'settled');
CREATE TYPE race_revision_status AS ENUM ('current', 'superseded');
CREATE TYPE result_source AS ENUM ('manual', 'image_import', 'api_import', 'migration');
CREATE TYPE transfer_status AS ENUM ('draft', 'reserved', 'confirmed', 'applied', 'cancelled');

CREATE TABLE app_user (
  firebase_uid text PRIMARY KEY,
  email text NOT NULL,
  display_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX app_user_email_unique ON app_user (lower(email));

CREATE TABLE driver (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  photo_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  logo_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE season (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  sequence integer NOT NULL UNIQUE CHECK (sequence > 0),
  status season_status NOT NULL DEFAULT 'draft',
  active_ruleset_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE season_ruleset (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES season(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  status ruleset_status NOT NULL DEFAULT 'draft',
  configuration jsonb NOT NULL,
  created_by text NOT NULL REFERENCES app_user(firebase_uid),
  published_by text REFERENCES app_user(firebase_uid),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (season_id, version),
  CHECK (jsonb_typeof(configuration) = 'object'),
  CHECK (status <> 'published' OR published_at IS NOT NULL)
);

CREATE UNIQUE INDEX season_one_published_ruleset
  ON season_ruleset (season_id)
  WHERE status = 'published';

ALTER TABLE season
  ADD CONSTRAINT season_active_ruleset_fk
  FOREIGN KEY (active_ruleset_id) REFERENCES season_ruleset(id);

CREATE TABLE season_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES season(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES team(id),
  manager_uid text REFERENCES app_user(firebase_uid),
  initial_budget numeric(12, 2) NOT NULL DEFAULT 0,
  current_budget numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, team_id)
);

CREATE TABLE season_driver (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES season(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES driver(id),
  user_uid text REFERENCES app_user(firebase_uid),
  base_rating numeric(5, 2) NOT NULL DEFAULT 50,
  purchase_price numeric(12, 2) NOT NULL DEFAULT 0,
  starts_at_sequence integer NOT NULL DEFAULT 1 CHECK (starts_at_sequence > 0),
  ends_at_sequence integer CHECK (ends_at_sequence >= starts_at_sequence),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, driver_id),
  UNIQUE (season_id, user_uid)
);

CREATE TABLE roster_assignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_driver_id uuid NOT NULL REFERENCES season_driver(id) ON DELETE CASCADE,
  season_team_id uuid NOT NULL REFERENCES season_team(id) ON DELETE CASCADE,
  starts_at_sequence integer NOT NULL DEFAULT 1 CHECK (starts_at_sequence > 0),
  ends_at_sequence integer CHECK (ends_at_sequence >= starts_at_sequence),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX roster_one_active_team_per_driver
  ON roster_assignment (season_driver_id)
  WHERE ends_at_sequence IS NULL;

ALTER TABLE roster_assignment
  ADD CONSTRAINT roster_no_overlapping_periods
  EXCLUDE USING gist (
    season_driver_id WITH =,
    int4range(starts_at_sequence, COALESCE(ends_at_sequence, 2147483647), '[]') WITH &&
  );

CREATE TABLE race (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES season(id) ON DELETE CASCADE,
  external_key text NOT NULL,
  display_name text NOT NULL,
  sequence integer NOT NULL CHECK (sequence > 0),
  scheduled_at timestamptz,
  status race_status NOT NULL DEFAULT 'draft',
  current_revision integer NOT NULL DEFAULT 0 CHECK (current_revision >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, external_key),
  UNIQUE (season_id, sequence)
);

CREATE TABLE race_source_asset (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL REFERENCES race(id) ON DELETE CASCADE,
  storage_key text NOT NULL UNIQUE,
  content_type text NOT NULL,
  original_filename text NOT NULL,
  uploaded_by text NOT NULL REFERENCES app_user(firebase_uid),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE race_revision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL REFERENCES race(id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision > 0),
  status race_revision_status NOT NULL DEFAULT 'current',
  source result_source NOT NULL DEFAULT 'manual',
  source_asset_id uuid REFERENCES race_source_asset(id),
  correction_reason text,
  created_by text NOT NULL REFERENCES app_user(firebase_uid),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (race_id, revision)
);

CREATE UNIQUE INDEX race_one_current_revision
  ON race_revision (race_id)
  WHERE status = 'current';

CREATE FUNCTION enforce_race_current_revision() RETURNS trigger AS $$
DECLARE
  checked_race_id uuid;
  revision_number integer;
  matching_revisions integer;
BEGIN
  IF TG_TABLE_NAME = 'race' THEN
    checked_race_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    checked_race_id := OLD.race_id;
  ELSE
    checked_race_id := NEW.race_id;
  END IF;
  SELECT current_revision INTO revision_number FROM race WHERE id = checked_race_id;
  IF revision_number IS NULL OR revision_number = 0 THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  SELECT count(*) INTO matching_revisions
    FROM race_revision
    WHERE race_id = checked_race_id AND revision = revision_number AND status = 'current';
  IF matching_revisions <> 1 THEN
    RAISE EXCEPTION 'La revisión actual de la carrera no es consistente';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER race_current_revision_valid
  AFTER INSERT OR UPDATE OF current_revision ON race
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION enforce_race_current_revision();

CREATE CONSTRAINT TRIGGER race_revision_matches_race
  AFTER INSERT OR UPDATE OR DELETE ON race_revision
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION enforce_race_current_revision();

CREATE TABLE race_result (
  race_revision_id uuid NOT NULL REFERENCES race_revision(id) ON DELETE CASCADE,
  season_driver_id uuid NOT NULL REFERENCES season_driver(id),
  season_team_id_at_race uuid NOT NULL REFERENCES season_team(id),
  qualifying_position integer NOT NULL CHECK (qualifying_position > 0),
  race_position integer CHECK (race_position > 0),
  dnf boolean NOT NULL DEFAULT false,
  own_error_dnf boolean NOT NULL DEFAULT false,
  clean_race boolean NOT NULL DEFAULT false,
  fastest_lap boolean NOT NULL DEFAULT false,
  mvp boolean NOT NULL DEFAULT false,
  driver_of_the_day boolean NOT NULL DEFAULT false,
  overtakes_boost boolean NOT NULL DEFAULT false,
  PRIMARY KEY (race_revision_id, season_driver_id),
  UNIQUE (race_revision_id, qualifying_position),
  CHECK (NOT own_error_dnf OR dnf),
  CHECK (dnf OR race_position IS NOT NULL)
);

CREATE UNIQUE INDEX race_result_unique_classified_position
  ON race_result (race_revision_id, race_position)
  WHERE race_position IS NOT NULL AND NOT dnf;

CREATE UNIQUE INDEX race_result_one_fastest_lap
  ON race_result (race_revision_id)
  WHERE fastest_lap;

CREATE UNIQUE INDEX race_result_one_mvp
  ON race_result (race_revision_id)
  WHERE mvp;

CREATE UNIQUE INDEX race_result_one_driver_of_the_day
  ON race_result (race_revision_id)
  WHERE driver_of_the_day;

CREATE TABLE driver_standing (
  season_driver_id uuid PRIMARY KEY REFERENCES season_driver(id) ON DELETE CASCADE,
  points numeric(10, 2) NOT NULL DEFAULT 0,
  rating numeric(5, 2) NOT NULL,
  wins integer NOT NULL DEFAULT 0,
  podiums integer NOT NULL DEFAULT 0,
  poles integer NOT NULL DEFAULT 0,
  dnfs integer NOT NULL DEFAULT 0,
  clean_races integer NOT NULL DEFAULT 0,
  recalculated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE team_standing (
  season_team_id uuid PRIMARY KEY REFERENCES season_team(id) ON DELETE CASCADE,
  points numeric(10, 2) NOT NULL DEFAULT 0,
  recalculated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE processing_command (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL,
  command_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  requested_by text NOT NULL REFERENCES app_user(firebase_uid),
  request_hash text NOT NULL,
  response jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requested_by, command_type, idempotency_key)
);

CREATE TABLE ledger_entry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES season(id) ON DELETE CASCADE,
  season_team_id uuid NOT NULL REFERENCES season_team(id),
  race_revision_id uuid REFERENCES race_revision(id),
  entry_type text NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount <> 0),
  idempotency_key text NOT NULL UNIQUE,
  reversal_of_id uuid REFERENCES ledger_entry(id),
  description text NOT NULL,
  created_by text NOT NULL REFERENCES app_user(firebase_uid),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ledger_one_reversal_per_entry
  ON ledger_entry (reversal_of_id)
  WHERE reversal_of_id IS NOT NULL;

CREATE TABLE transfer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_driver_id uuid NOT NULL REFERENCES season_driver(id),
  from_season_team_id uuid REFERENCES season_team(id),
  to_season_team_id uuid NOT NULL REFERENCES season_team(id),
  status transfer_status NOT NULL DEFAULT 'draft',
  amount numeric(12, 2) NOT NULL,
  effective_from_sequence integer NOT NULL CHECK (effective_from_sequence > 0),
  created_by text NOT NULL REFERENCES app_user(firebase_uid),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX transfer_one_open_per_driver
  ON transfer (season_driver_id)
  WHERE status IN ('reserved', 'confirmed');

CREATE FUNCTION enforce_same_season() RETURNS trigger AS $$
DECLARE
  expected_season_id uuid;
  related_season_id uuid;
  driver_starts_at integer;
  driver_ends_at integer;
  race_sequence integer;
BEGIN
  IF TG_TABLE_NAME = 'roster_assignment' THEN
    SELECT season_id, starts_at_sequence, ends_at_sequence
      INTO expected_season_id, driver_starts_at, driver_ends_at
      FROM season_driver WHERE id = NEW.season_driver_id;
    SELECT season_id INTO related_season_id FROM season_team WHERE id = NEW.season_team_id;
    IF NEW.starts_at_sequence < driver_starts_at
      OR (driver_ends_at IS NOT NULL
        AND (NEW.ends_at_sequence IS NULL OR NEW.ends_at_sequence > driver_ends_at)) THEN
      RAISE EXCEPTION 'La asignación de equipo queda fuera del periodo de participación';
    END IF;
  ELSIF TG_TABLE_NAME = 'race_result' THEN
    SELECT r.season_id, r.sequence INTO expected_season_id, race_sequence
      FROM race_revision rev JOIN race r ON r.id = rev.race_id
      WHERE rev.id = NEW.race_revision_id;
    SELECT season_id, starts_at_sequence, ends_at_sequence
      INTO related_season_id, driver_starts_at, driver_ends_at
      FROM season_driver WHERE id = NEW.season_driver_id;
    IF related_season_id IS DISTINCT FROM expected_season_id THEN
      RAISE EXCEPTION 'El piloto no pertenece a la temporada de la carrera';
    END IF;
    IF race_sequence < driver_starts_at
      OR (driver_ends_at IS NOT NULL AND race_sequence > driver_ends_at) THEN
      RAISE EXCEPTION 'El piloto no está inscrito para esta carrera';
    END IF;
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
  ELSIF TG_TABLE_NAME = 'transfer' THEN
    SELECT season_id INTO expected_season_id FROM season_driver WHERE id = NEW.season_driver_id;
    SELECT season_id INTO related_season_id FROM season_team WHERE id = NEW.to_season_team_id;
    IF related_season_id IS DISTINCT FROM expected_season_id THEN
      RAISE EXCEPTION 'El equipo destino no pertenece a la temporada del piloto';
    END IF;
    IF NEW.from_season_team_id IS NULL THEN
      RETURN NEW;
    END IF;
    SELECT season_id INTO related_season_id FROM season_team WHERE id = NEW.from_season_team_id;
  ELSIF TG_TABLE_NAME = 'ledger_entry' THEN
    expected_season_id := NEW.season_id;
    SELECT season_id INTO related_season_id FROM season_team WHERE id = NEW.season_team_id;
    IF related_season_id IS DISTINCT FROM expected_season_id THEN
      RAISE EXCEPTION 'El equipo del asiento no pertenece a la temporada';
    END IF;
    IF NEW.race_revision_id IS NULL THEN
      RETURN NEW;
    END IF;
    SELECT r.season_id INTO related_season_id
      FROM race_revision rev JOIN race r ON r.id = rev.race_id
      WHERE rev.id = NEW.race_revision_id;
  END IF;

  IF related_season_id IS DISTINCT FROM expected_season_id THEN
    RAISE EXCEPTION 'Las entidades relacionadas deben pertenecer a la misma temporada';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roster_assignment_same_season
  BEFORE INSERT OR UPDATE ON roster_assignment
  FOR EACH ROW EXECUTE FUNCTION enforce_same_season();

CREATE TRIGGER race_result_same_season
  BEFORE INSERT OR UPDATE ON race_result
  FOR EACH ROW EXECUTE FUNCTION enforce_same_season();

CREATE TRIGGER transfer_same_season
  BEFORE INSERT OR UPDATE ON transfer
  FOR EACH ROW EXECUTE FUNCTION enforce_same_season();

CREATE TRIGGER ledger_entry_same_season
  BEFORE INSERT OR UPDATE ON ledger_entry
  FOR EACH ROW EXECUTE FUNCTION enforce_same_season();

CREATE FUNCTION preserve_driver_result_history() RETURNS trigger AS $$
BEGIN
  IF NEW.driver_id IS DISTINCT FROM OLD.driver_id AND EXISTS (
    SELECT 1 FROM race_result WHERE season_driver_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'No se puede cambiar la identidad de un piloto con resultados';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM race_result result
    JOIN race_revision revision ON revision.id = result.race_revision_id
    JOIN race ON race.id = revision.race_id
    WHERE result.season_driver_id = OLD.id
      AND (race.sequence < NEW.starts_at_sequence
        OR (NEW.ends_at_sequence IS NOT NULL AND race.sequence > NEW.ends_at_sequence))
  ) THEN
    RAISE EXCEPTION 'El nuevo periodo de participación excluiría resultados históricos';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER season_driver_preserve_history
  BEFORE UPDATE OF driver_id, starts_at_sequence, ends_at_sequence ON season_driver
  FOR EACH ROW EXECUTE FUNCTION preserve_driver_result_history();

CREATE FUNCTION preserve_roster_result_history() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM race_result result
    JOIN race_revision revision ON revision.id = result.race_revision_id
    JOIN race ON race.id = revision.race_id
    WHERE result.season_driver_id = OLD.season_driver_id
      AND result.season_team_id_at_race = OLD.season_team_id
      AND race.sequence >= OLD.starts_at_sequence
      AND (OLD.ends_at_sequence IS NULL OR race.sequence <= OLD.ends_at_sequence)
      AND (
        TG_OP = 'DELETE'
        OR NEW.season_driver_id IS DISTINCT FROM OLD.season_driver_id
        OR NEW.season_team_id IS DISTINCT FROM OLD.season_team_id
        OR race.sequence < NEW.starts_at_sequence
        OR (NEW.ends_at_sequence IS NOT NULL AND race.sequence > NEW.ends_at_sequence)
      )
  ) THEN
    RAISE EXCEPTION 'El cambio de plantilla dejaría resultados sin equipo histórico';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roster_assignment_preserve_history
  BEFORE UPDATE OR DELETE ON roster_assignment
  FOR EACH ROW EXECUTE FUNCTION preserve_roster_result_history();

CREATE FUNCTION enforce_active_ruleset() RETURNS trigger AS $$
DECLARE
  ruleset_season_id uuid;
  ruleset_state ruleset_status;
BEGIN
  IF NEW.active_ruleset_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT season_id, status INTO ruleset_season_id, ruleset_state
    FROM season_ruleset WHERE id = NEW.active_ruleset_id;
  IF ruleset_season_id IS DISTINCT FROM NEW.id OR ruleset_state <> 'published' THEN
    RAISE EXCEPTION 'El ruleset activo debe estar publicado y pertenecer a la temporada';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER season_active_ruleset_valid
  BEFORE INSERT OR UPDATE OF active_ruleset_id ON season
  FOR EACH ROW EXECUTE FUNCTION enforce_active_ruleset();

CREATE FUNCTION prevent_archiving_active_ruleset() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'published' AND NEW.status <> 'published'
    AND EXISTS (SELECT 1 FROM season WHERE active_ruleset_id = NEW.id) THEN
    RAISE EXCEPTION 'No se puede archivar el ruleset activo de una temporada';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER season_ruleset_keep_active_published
  BEFORE UPDATE OF status ON season_ruleset
  FOR EACH ROW EXECUTE FUNCTION prevent_archiving_active_ruleset();

CREATE FUNCTION enforce_revision_source_asset() RETURNS trigger AS $$
DECLARE
  asset_race_id uuid;
BEGIN
  IF NEW.source_asset_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT race_id INTO asset_race_id FROM race_source_asset WHERE id = NEW.source_asset_id;
  IF asset_race_id IS DISTINCT FROM NEW.race_id THEN
    RAISE EXCEPTION 'La imagen de origen debe pertenecer a la misma carrera';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER race_revision_source_asset_valid
  BEFORE INSERT OR UPDATE ON race_revision
  FOR EACH ROW EXECUTE FUNCTION enforce_revision_source_asset();

CREATE TABLE audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_uid text REFERENCES app_user(firebase_uid),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_entity_idx ON audit_log (entity_type, entity_id, created_at DESC);
CREATE INDEX race_season_status_idx ON race (season_id, status, sequence);
CREATE INDEX race_revision_race_idx ON race_revision (race_id, revision DESC);
CREATE INDEX ledger_season_team_idx ON ledger_entry (season_id, season_team_id, created_at);
