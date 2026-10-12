import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";
import { Image, MessageCircle, Send, Video, Share2, Vote, Crown, Check } from "lucide-react";
import { useSearchParams, Link } from "react-router";
import { votarPilotoDelDia } from "../services/raceProcessor";
import { buildVotingArchive, type VotingArchiveItem } from "../services/readModels";
import { Badge, Button, Card, EmptyState, Notice, StatusPill, cn } from "./ui";
import { compressAndConvertImage } from "../utils/imageHelper";
import { useSingleFlight } from "../hooks/useSingleFlight";

interface PaddockPost { id: string; author: string; authorPhoto?: string; text: string; mediaUrl?: string; mediaType?: "image" | "video"; createdAt: string; kind?: string; splitName?: string; }

const PAGE_SIZE = 15;

export function PaddockForum({ readOnly = false }: { readOnly?: boolean }) {
  const { user, userData } = useAuth();
  const [posts, setPosts] = useState<PaddockPost[]>([]);
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [published, setPublished] = useState(false);
  // Se cargan los mensajes por tandas para no descargar toda la conversación de golpe.
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => onSnapshot(query(collection(db, "paddock_posts"), orderBy("createdAt", "desc"), limit(visible)), snapshot => {
    setPosts(snapshot.docs.map(item => ({ id: item.id, ...item.data() })) as PaddockPost[]);
    setLoading(false);
  }, () => { setLoading(false); setError("No se pudo cargar el paddock. Comprueba tu conexión y vuelve a entrar."); }), [visible]);

  const { run: runOnce } = useSingleFlight();
  const publish = async () => {
    return runOnce(async () => {
    if (!user || !userData || (!text.trim() && !mediaUrl)) return;
    setPublishing(true);
    setError("");
    setPublished(false);
    try {
      await addDoc(collection(db, "paddock_posts"), {
        author: userData.nombre || "Piloto",
        authorPhoto: userData.foto_url || "",
        text: text.trim(),
        mediaUrl: mediaUrl || null,
        mediaType: mediaUrl ? mediaType : null,
        createdAt: new Date().toISOString(),
        authorId: user.uid,
      });
      setText(""); setMediaUrl("");
      setPublished(true);
    } catch {
      setError("No se ha podido publicar. Tu mensaje sigue aquí: inténtalo de nuevo.");
    } finally { setPublishing(false); }
    });
  };

  const attachImage = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      setMediaUrl(await compressAndConvertImage(file, 900, 900, 0.8));
      setMediaType("image");
    } catch { setError("No se pudo adjuntar la foto. Prueba con otra imagen."); }
  };

  return <section className="space-y-4" aria-label="Paddock">
    {error && <Notice tone="danger">{error}</Notice>}
    {published && <Notice tone="ok">¡Ya estás en la conversación! Tu mensaje está publicado.</Notice>}
    {!readOnly && <Card as="div">
      <label htmlFor="paddock-message" className="mb-1 block text-sm font-bold text-ink">Tu voz en el paddock</label>
      <p className="mb-3 text-sm text-ink-muted">No hace falta una crónica: una frase basta para empezar.</p>
      <div className="mb-3 flex flex-wrap gap-2">{["¡Hola, paddock! Soy ", "Nuestro objetivo para este split es ", "Mi favorito para la próxima carrera es "].map(prompt => <button key={prompt} type="button" disabled={!!text || publishing} onClick={() => { setText(prompt); document.getElementById("paddock-message")?.focus(); }} className="min-h-11 rounded-full border border-line-strong bg-surface px-3 text-xs font-semibold text-ink-2 hover:bg-surface-3 disabled:opacity-40">{prompt.startsWith("¡Hola") ? "Presentarme" : prompt.startsWith("Nuestro") ? "Objetivo del equipo" : "Mi pronóstico"}</button>)}</div>
      <textarea id="paddock-message" value={text} onChange={event => setText(event.target.value)} placeholder="¿Qué se comenta en tu box?" maxLength={500} className="min-h-28 w-full resize-y rounded-lg border border-line-strong bg-surface p-3 text-base text-ink outline-none focus:border-brand" />
      <div className="mt-3 grid gap-2 md:flex md:flex-wrap md:items-center">
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface px-3 text-sm font-semibold text-ink-2 hover:bg-surface-3"><Image aria-hidden="true" className="h-4 w-4" /> Foto<input type="file" accept="image/*" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) attachImage(file); }} /></label>
        <input value={mediaType === "video" ? mediaUrl : ""} onChange={event => { setMediaUrl(event.target.value); setMediaType("video"); }} placeholder="URL de vídeo" aria-label="URL de vídeo" className="min-h-11 w-full flex-1 rounded-lg border border-line-strong bg-surface px-3 text-ink outline-none focus:border-brand md:w-auto md:min-w-48" />
        <Button variant="primary" onClick={publish} loading={publishing} disabled={!text.trim() && !mediaUrl}><Send aria-hidden="true" className="h-4 w-4" /> {publishing ? "Publicando" : "Publicar"}</Button>
      </div>
      {mediaUrl && mediaType === "image" && <img src={mediaUrl} alt="Vista previa" className="mt-3 max-h-72 max-w-full rounded-lg border border-line object-contain" />}
    </Card>}
    {loading && <p role="status" className="py-6 text-center text-sm text-ink-muted">Cargando la conversación…</p>}
    {!loading && !error && posts.length === 0 && <EmptyState icon={MessageCircle} title="La conversación empieza contigo" description={readOnly ? "Entra con tu cuenta para saludar a la parrilla." : "Preséntate o comparte tu pronóstico para la próxima carrera."} />}
    <div className="space-y-3">{posts.map(post => <Card as="article" key={post.id} pad="sm" className="md:p-4">
      {post.kind === "team_welcome" && <p className="mb-3 text-sm font-bold text-ok">Plantilla completa · {post.splitName}</p>}
      <div className="flex items-center gap-3"><div className="h-9 w-9 overflow-hidden rounded-full border border-line bg-surface-2">{post.authorPhoto ? <img src={post.authorPhoto} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}</div><div><p className="text-sm font-bold text-ink">{post.author}</p><time className="text-xs text-ink-muted">{new Date(post.createdAt).toLocaleString("es-ES")}</time></div></div>
      {post.text && <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">{post.text}</p>}
      {post.mediaUrl && (post.mediaType === "video" ? <a href={post.mediaUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand"><Video aria-hidden="true" className="h-4 w-4" /> Ver vídeo</a> : <img src={post.mediaUrl} alt="Publicación del paddock" loading="lazy" className="mt-3 max-h-96 max-w-full rounded-lg object-contain" />)}
    </Card>)}</div>
    {!loading && posts.length >= visible && <div className="text-center"><Button variant="secondary" onClick={() => setVisible(v => v + PAGE_SIZE)}>Ver mensajes anteriores</Button></div>}
  </section>;
}

// ── COMUNIDAD: Paddock + votaciones ──────────────────────────────────────────

type Section = "paddock" | "actual" | "archivo";

function VotingCard({ item, splitId, pilotName, uid, defaultOpen }: {
  item: VotingArchiveItem; splitId: string; pilotName: (id: string) => string; uid?: string; defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [voting, setVoting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "danger" | "info"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const total = Object.values(item.tally).reduce((a, b) => a + b, 0);
  const canVote = item.status === "open" && Boolean(uid);

  const { run: runOnce } = useSingleFlight();
  const vote = async (pilotId: string) => {
    return runOnce(async () => {
    if (!uid || voting) return;
    setMessage(null);
    setVoting(pilotId);
    try {
      const result = await votarPilotoDelDia(splitId, item.circuitId, uid, pilotId);
      setMessage({ tone: result.ok ? "ok" : "danger", text: result.ok ? "Voto registrado." : result.message });
    } catch {
      setMessage({ tone: "danger", text: "No se ha podido guardar tu voto. Comprueba tu conexión y vuelve a intentarlo." });
    } finally { setVoting(null); }
    });
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(item.shareUrl);
      setCopied(true);
      setMessage({ tone: "info", text: "Enlace copiado. Cualquiera puede consultar; solo las cuentas registradas pueden votar." });
    } catch {
      setMessage({ tone: "danger", text: "No se pudo copiar el enlace. Comprueba los permisos del navegador." });
    }
  };

  return (
    <Card as="article" pad="none" id={`votacion-${item.circuitId}`}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex min-h-14 w-full items-center justify-between gap-3 p-4 text-left">
        <span className="min-w-0">
          <span className="block truncate text-base font-bold text-ink">GP de {item.circuitName}</span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <StatusPill tone={item.status === "open" ? "ok" : "neutral"}>{item.status === "open" ? "Abierta" : "Cerrada"}</StatusPill>
            <span>{total} voto{total === 1 ? "" : "s"}</span>
            {item.hasVoted && <Badge tone="info"><Check aria-hidden="true" className="h-3 w-3" /> Ya has votado</Badge>}
          </span>
        </span>
        {item.winnerId && <span className="hidden shrink-0 items-center gap-1.5 text-xs font-semibold text-warn sm:flex"><Crown aria-hidden="true" className="h-4 w-4" />{pilotName(item.winnerId)}</span>}
      </button>
      {open && (
        <div className="space-y-3 border-t border-line p-4">
          {item.winnerId && <p className="flex items-center gap-2 text-sm font-semibold text-warn"><Crown aria-hidden="true" className="h-4 w-4" /> Piloto del día: {pilotName(item.winnerId)}</p>}
          {!uid && item.status === "open" && <Notice tone="info">Los visitantes pueden consultar la votación. <Link to="/login" className="font-semibold underline underline-offset-4">Inicia sesión para votar</Link>.</Notice>}
          {item.candidates.length === 0 ? (
            <p className="text-sm text-ink-muted">Esta votación no tiene candidatos registrados.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {item.candidates.map(id => {
                const selected = item.myVote === id;
                const count = item.tally[id] ?? 0;
                return (
                  <li key={id}>
                    <button type="button" disabled={!canVote || voting !== null} aria-pressed={selected} onClick={() => vote(id)}
                      className={cn("flex min-h-12 w-full items-center justify-between gap-2 rounded-lg border px-3 text-left transition-colors disabled:cursor-default",
                        selected ? "border-brand bg-brand-soft" : "border-line bg-surface-2", canVote && !selected && "hover:border-line-strong")}>
                      <span className="truncate text-sm font-semibold text-ink">{pilotName(id)}{selected && <span className="ml-2 text-xs font-bold text-brand">Tu voto</span>}</span>
                      <span className="shrink-0 text-xs tabular-nums text-ink-muted">{voting === id ? "Guardando…" : `${count} voto${count === 1 ? "" : "s"}`}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {canVote && item.hasVoted && <p className="text-xs text-ink-muted">Un voto por cuenta. Elegir otro piloto sustituye el anterior.</p>}
          {message && <Notice tone={message.tone}>{message.text}</Notice>}
          <Button variant="secondary" size="sm" onClick={share}><Share2 aria-hidden="true" className="h-4 w-4" /> {copied ? "Enlace copiado" : "Compartir votación"}</Button>
        </div>
      )}
    </Card>
  );
}

export function ComunidadView({ splits, defaultSplitId }: { splits: any[]; defaultSplitId: string }) {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const linkedCircuit = searchParams.get("carrera");
  const [section, setSection] = useState<Section>(() => (linkedCircuit ? "archivo" : "paddock"));
  const [splitId, setSplitId] = useState(() => {
    const linked = searchParams.get("temporada");
    return linked && splits.some(s => s.id === linked) ? linked : defaultSplitId;
  });
  const split = splits.find(s => s.id === splitId) ?? splits.find(s => s.id === defaultSplitId) ?? null;
  const uid = user?.uid;

  const archive = useMemo(
    () => split ? buildVotingArchive(split.id, split.circuitos ?? [], window.location.origin, uid) : [],
    [split, uid],
  );
  const pilotName = (id: string) => split?.roster?.find((p: any) => p.pilotoId === id)?.nombre ?? id;
  const current = archive.filter(a => a.status === "open");

  const SECTIONS: { id: Section; label: string }[] = [
    { id: "paddock", label: "Paddock" },
    { id: "actual", label: "Votación actual" },
    { id: "archivo", label: "Archivo" },
  ];

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Comunidad" className="flex gap-1 rounded-lg border border-line bg-surface-3 p-1">
        {SECTIONS.map(sec => (
          <button key={sec.id} role="tab" type="button" aria-selected={section === sec.id} onClick={() => setSection(sec.id)}
            className={cn("min-h-11 flex-1 rounded-md px-3 text-sm font-semibold transition-colors", section === sec.id ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink")}>
            {sec.label}{sec.id === "actual" && current.length > 0 ? ` (${current.length})` : ""}
          </button>
        ))}
      </div>

      {section === "paddock" && <PaddockForum />}

      {section !== "paddock" && (
        <>
          {splits.length > 1 && (
            <div className="m-rail hide-scrollbar gap-2" role="group" aria-label="Temporada">
              {splits.map(s => (
                <button key={s.id} type="button" aria-pressed={split?.id === s.id} onClick={() => setSplitId(s.id)}
                  className={cn("min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
                    split?.id === s.id ? "border-brand bg-brand text-brand-ink" : "border-line-strong bg-surface text-ink-2 hover:bg-surface-3")}>
                  {s.nombre}
                </button>
              ))}
            </div>
          )}
          {!split ? (
            <EmptyState icon={Vote} title="Sin temporada disponible" description="Las votaciones aparecen cuando hay una temporada con carreras disputadas." />
          ) : section === "actual" ? (
            current.length === 0 ? (
              <EmptyState icon={Vote} title="No hay ninguna votación abierta" description="Cuando el administrador abra la votación al mejor piloto de una carrera, aparecerá aquí. Mientras tanto puedes revisar el archivo." />
            ) : (
              <div className="space-y-3">{current.map(item => <VotingCard key={item.circuitId} item={item} splitId={split.id} pilotName={pilotName} uid={uid} defaultOpen />)}</div>
            )
          ) : archive.length === 0 ? (
            <EmptyState icon={Vote} title="Archivo vacío" description={`${split.nombre} todavía no tiene votaciones abiertas ni cerradas.`} />
          ) : (
            <div className="space-y-3">{archive.map(item => <VotingCard key={item.circuitId} item={item} splitId={split.id} pilotName={pilotName} uid={uid} defaultOpen={item.circuitId === linkedCircuit} />)}</div>
          )}
        </>
      )}
    </div>
  );
}
