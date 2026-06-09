/**
 * Reset economy data for a split.
 * Usage: node scripts/resetEconomy.mjs <splitId> <idToken>
 *
 * Get your ID token from the browser console while logged in:
 *   firebase.auth().currentUser.getIdToken().then(t => console.log(t))
 *   OR open DevTools → Application → IndexedDB → firebaseLocalStorage → find token
 */

const [, , splitId = "split_2", idToken] = process.argv;

const PROJECT_ID = "gen-lang-client-0829043813";
const DATABASE   = "ai-studio-4147307b-9726-4502-a41f-213e9107e179";
const BASE       = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE}/documents`;

if (!idToken) {
  console.error("❌  Falta el ID token. Ejecución:");
  console.error("   node scripts/resetEconomy.mjs split_2 <TOKEN>");
  console.error("");
  console.error("   Para obtener el token, abre la consola del navegador (F12)");
  console.error("   mientras estás logueado como admin y ejecuta:");
  console.error("   firebase.auth().currentUser.getIdToken().then(t=>console.log(t))");
  process.exit(1);
}

async function firestoreRequest(method, path, body) {
  const res = await fetch(`${BASE}/${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

async function listDocs(collectionPath) {
  const res = await firestoreRequest("GET", `${collectionPath}?pageSize=300`);
  return res?.documents ?? [];
}

function buildResetPatch(docName) {
  return {
    document: {
      name: docName,
      fields: {
        precio_compra:          { doubleValue: 0 },
        clausula_actual:        { doubleValue: 0 },
        mantener_actual:        { doubleValue: 0 },
        clausula_inicial_split: { doubleValue: 0 },
        mantener_inicial_split: { doubleValue: 0 },
        precio_carrera_anterior:{ doubleValue: 0 },
        historial_precios:      { mapValue: { fields: {} } },
        congelado:              { booleanValue: false },
        congelado_en:           { nullValue: "NULL_VALUE" },
        tipo_fichaje:           { nullValue: "NULL_VALUE" },
      },
    },
    updateMask: {
      fieldPaths: [
        "precio_compra", "clausula_actual", "mantener_actual",
        "clausula_inicial_split", "mantener_inicial_split",
        "precio_carrera_anterior", "historial_precios",
        "congelado", "congelado_en", "tipo_fichaje",
      ],
    },
  };
}

async function main() {
  console.log(`\n🔄  Reseteando economía de ${splitId}…\n`);

  // 1. Reset roster pilots
  const rosterDocs = await listDocs(`splits/${splitId}/roster`);
  console.log(`   ${rosterDocs.length} pilotos en roster`);

  for (const doc of rosterDocs) {
    const docName = doc.name;
    const pilotoId = docName.split("/").pop();
    const patchRes = await firestoreRequest(
      "PATCH",
      `splits/${splitId}/roster/${pilotoId}?updateMask.fieldPaths=precio_compra&updateMask.fieldPaths=clausula_actual&updateMask.fieldPaths=mantener_actual&updateMask.fieldPaths=clausula_inicial_split&updateMask.fieldPaths=mantener_inicial_split&updateMask.fieldPaths=precio_carrera_anterior&updateMask.fieldPaths=historial_precios&updateMask.fieldPaths=congelado&updateMask.fieldPaths=tipo_fichaje`,
      {
        name: docName,
        fields: {
          precio_compra:          { doubleValue: 0 },
          clausula_actual:        { doubleValue: 0 },
          mantener_actual:        { doubleValue: 0 },
          clausula_inicial_split: { doubleValue: 0 },
          mantener_inicial_split: { doubleValue: 0 },
          precio_carrera_anterior:{ doubleValue: 0 },
          historial_precios:      { mapValue: { fields: {} } },
          congelado:              { booleanValue: false },
          tipo_fichaje:           { nullValue: "NULL_VALUE" },
        },
      }
    );
    console.log(`   ✓ ${pilotoId}`);
  }

  // 2. Reset economia_procesada on all circuits
  const circDocs = await listDocs(`splits/${splitId}/circuitos`);
  console.log(`\n   ${circDocs.length} circuitos`);

  for (const doc of circDocs) {
    const circId = doc.name.split("/").pop();
    await firestoreRequest(
      "PATCH",
      `splits/${splitId}/circuitos/${circId}?updateMask.fieldPaths=economia_procesada`,
      {
        name: doc.name,
        fields: { economia_procesada: { booleanValue: false } },
      }
    );
    console.log(`   ✓ circuito ${circId}`);
  }

  console.log("\n✅  Reset completado. Ahora establece los precios desde el panel de Economía.\n");
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
