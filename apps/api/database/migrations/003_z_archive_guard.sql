-- Solo el importador, dentro de su transacción, puede escribir el archivo.
-- La API no establece f1.import_mode y no usa este archivo para economía.
CREATE FUNCTION protect_source_document_archive() RETURNS trigger AS $$
BEGIN
  IF current_setting('f1.import_mode', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'El archivo de origen es de solo lectura';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER source_document_archive_read_only
  BEFORE INSERT OR UPDATE OR DELETE ON source_document_archive
  FOR EACH ROW EXECUTE FUNCTION protect_source_document_archive();
