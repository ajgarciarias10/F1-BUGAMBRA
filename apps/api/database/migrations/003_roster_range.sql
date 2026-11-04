-- Un extremo abierto representa una asignación activa sin fecha final.
-- 2147483647 con intervalo inclusivo desborda int4range al canonizarlo.
ALTER TABLE roster_assignment DROP CONSTRAINT roster_no_overlapping_periods;
ALTER TABLE roster_assignment ADD CONSTRAINT roster_no_overlapping_periods
  EXCLUDE USING gist (
    season_driver_id WITH =,
    int4range(starts_at_sequence, ends_at_sequence, '[]') WITH &&
  );
