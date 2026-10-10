import { collection, doc, runTransaction, serverTimestamp, type DocumentReference } from "firebase/firestore";
import { db } from "./firebase";
import { auth } from "./auth";

type AuditedMutation = {
  ref: DocumentReference;
  action: string;
  summary: string;
  apply: (current: Record<string, any> | null) => Record<string, any> | null;
};

/** Apply one admin edit atomically and retain its before/after values for review. */
export async function runAuditedAdminMutation({ ref, action, summary, apply }: AuditedMutation) {
  const auditRef = doc(collection(db, "admin_audit"));
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    const before = snapshot.exists() ? snapshot.data() : null;
    const after = apply(before);
    if (after === null) {
      if (snapshot.exists()) transaction.delete(ref);
    } else if (snapshot.exists()) {
      transaction.set(ref, after);
    } else transaction.set(ref, after);
    transaction.set(auditRef, {
      action,
      target: ref.path,
      summary,
      before,
      after,
      actorUid: auth.currentUser?.uid ?? null,
      createdAt: serverTimestamp(),
    });
  });
}
