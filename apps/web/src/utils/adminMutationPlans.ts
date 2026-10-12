// Pure planners for audited admin edits. They take the document values read inside
// a transaction and return the full "after" documents (or null for "nothing to do").

export type DocData = Record<string, any>;
export type DocPatch = Record<string, any>;

/** Merge a patch into a stored document (or into an empty one when it does not exist). */
export function mergeDoc(current: DocData | null, patch: DocPatch): DocData {
  return { ...(current ?? {}), ...patch };
}

/** Plan a boolean flag change from an intended transition; reject a stale expectation. */
export function planBooleanFlag(
  current: DocData | null,
  field: string,
  expected: boolean,
  extra: DocPatch = {},
): { after: DocData; next: boolean } {
  if (!current) throw new Error("El documento ya no existe.");
  const stored = !!current[field];
  if (stored !== expected) {
    throw new Error("El estado guardado cambió desde que se cargó el panel. Recarga y vuelve a intentarlo.");
  }
  const next = !expected;
  return { after: mergeDoc(current, { ...extra, [field]: next }), next };
}

/** Plan acta_cerrada; returns after=null when the stored value is already the desired one. */
export function planActaCerrada(current: DocData | null, desired: boolean): { after: DocData | null } {
  if (!current) throw new Error("La carrera ya no existe.");
  if (!!current.acta_cerrada === desired) return { after: null };
  return { after: mergeDoc(current, { acta_cerrada: desired }) };
}

/** Rename only the documents that exist; throws when none of them does. */
export function planNameEdit(
  currents: Record<string, DocData | null>,
  name: string,
): Record<string, DocData> {
  const writes: Record<string, DocData> = {};
  for (const [path, data] of Object.entries(currents)) {
    if (data) writes[path] = mergeDoc(data, { nombre: name });
  }
  if (!Object.keys(writes).length) throw new Error("No se encontró ningún documento de ese piloto.");
  return writes;
}

export type PhotoTarget = { path: string; mode: "update" | "merge" };

/**
 * Plan a photo edit across documents. "update" targets must exist (they are skipped
 * if missing and optional); "merge" targets are created when absent.
 * Required targets that are missing make the whole edit fail.
 */
export function planPhotoEdit(
  currents: Record<string, DocData | null>,
  targets: (PhotoTarget & { required?: boolean })[],
  photo: string | null,
): Record<string, DocData> {
  const writes: Record<string, DocData> = {};
  for (const t of targets) {
    const data = currents[t.path] ?? null;
    if (!data && t.mode === "update") {
      if (t.required) throw new Error(`El documento ${t.path} no existe.`);
      continue;
    }
    writes[t.path] = mergeDoc(data, { foto_url: photo });
  }
  return writes;
}
