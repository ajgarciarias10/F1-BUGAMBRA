import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";
import { getYoutubeEmbedUrl, getYoutubeThumbnailUrl, getYoutubeVideoId } from "../utils/youtube";
import { ArrowUpRight, Loader2, MonitorPlay, Play, Plus, Radio, Trash2, Video } from "lucide-react";

const FOM_CHANNEL = {
  id: "tonicotitular",
  name: "Tonicotitular",
  label: "Cámara oficial Tonicotitular",
};

interface Interview {
  id: string;
  title: string;
  youtubeUrl: string;
  authorName: string;
  createdAt: string;
}

function InterviewsSection({ compact }: { compact: boolean }) {
  const { user, userData } = useAuth();
  const isAdmin = userData?.rol === "admin";
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => onSnapshot(query(collection(db, "fom_interviews"), orderBy("createdAt", "desc")), snapshot => {
    setInterviews(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Interview[]);
  }), []);

  const validUrl = getYoutubeVideoId(url) !== "";

  const publish = async () => {
    if (!user || !userData || !title.trim() || !validUrl) return;
    setPublishing(true);
    try {
      await addDoc(collection(db, "fom_interviews"), {
        title: title.trim(),
        youtubeUrl: url.trim(),
        authorName: userData.nombre || "Admin",
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
      });
      setTitle(""); setUrl("");
    } finally {
      setPublishing(false);
    }
  };

  const remove = async (id: string) => {
    if (!isAdmin) return;
    await deleteDoc(doc(db, "fom_interviews", id));
  };

  return (
    <section className="m-card border border-white/10 bg-white/[0.02] p-4 md:p-5">
      <div className="flex items-center gap-2 mb-4">
        <Video className="w-4 h-4 text-[#e10600]" />
        <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/40">Entrevistas</span>
      </div>

      {isAdmin && (
        <div className="m-card mb-4 flex flex-col gap-2 border border-white/10 bg-black/20 p-3 md:flex-row md:items-center">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título de la entrevista" maxLength={120}
            className="min-h-12 w-full flex-1 rounded-xl border border-white/10 bg-black/30 px-3 text-white outline-none focus:border-[#e10600] md:min-h-0 md:min-w-40 md:rounded-none md:py-2 md:text-xs" />
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL de YouTube"
            className="min-h-12 w-full flex-1 rounded-xl border border-white/10 bg-black/30 px-3 text-white outline-none focus:border-[#e10600] md:min-h-0 md:min-w-48 md:rounded-none md:py-2 md:text-xs" />
          <button onClick={publish} disabled={publishing || !title.trim() || !validUrl}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#e10600] px-4 text-sm font-bold text-white disabled:opacity-35 md:min-h-0 md:rounded-none md:py-2 md:text-[10px] md:font-black md:uppercase md:tracking-wider">
            {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Añadir
          </button>
        </div>
      )}

      {interviews.length === 0 ? (
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/25 py-3 text-center">Todavía no hay entrevistas publicadas</p>
      ) : (
        <div className={`grid gap-3 ${compact ? "" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
          {interviews.map(item => (
            <article key={item.id} className="border border-white/8 bg-black/25">
              {openId === item.id ? (
                <div className="aspect-video bg-black">
                  <iframe src={getYoutubeEmbedUrl(item.youtubeUrl)} className="w-full h-full border-0" allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" />
                </div>
              ) : (
                <button onClick={() => setOpenId(item.id)} className="relative block w-full aspect-video bg-black group">
                  <img src={getYoutubeThumbnailUrl(item.youtubeUrl)} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  <span className="absolute inset-0 grid place-items-center bg-black/30 group-hover:bg-black/15 transition-colors">
                    <span className="w-11 h-11 grid place-items-center bg-[#e10600] shadow-[0_8px_24px_rgba(225,6,0,0.4)]"><Play className="w-5 h-5 text-white ml-0.5" fill="white" /></span>
                  </span>
                </button>
              )}
              <div className="p-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-black uppercase text-xs truncate">{item.title}</p>
                  <p className="text-[8px] font-mono text-white/30 uppercase tracking-wider mt-0.5">{item.authorName}</p>
                </div>
                {isAdmin && (
                  <button onClick={() => remove(item.id)} className="shrink-0 text-white/20 hover:text-red-300 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function FomLive({ compact = false }: { compact?: boolean }) {
  const domain = window.location.hostname || "localhost";
  const parent = domain === "localhost" ? "localhost" : domain;

  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      <section className="m-card relative overflow-hidden border border-white/10 bg-[#08090c] text-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <img src="/fom-broadcast.jpeg" alt="" className="absolute inset-0 w-full h-full object-cover object-center opacity-30" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,9,0.6),rgba(5,6,9,0.93)_75%),linear-gradient(90deg,rgba(5,6,9,0.85),transparent_55%)]" />

        <div className="relative z-10 flex flex-col justify-between gap-3 p-4 md:flex-row md:items-end md:gap-4 md:px-8 md:pt-8 md:pb-6">
          <div className="flex items-center gap-3">
            <div className="bg-[#e10600] p-3 shadow-[0_10px_30px_rgba(225,6,0,0.3)]">
              <MonitorPlay className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#e10600]">F1 Bugambra TV</p>
              <h2 className="mt-1 text-2xl font-black uppercase leading-none tracking-[-0.045em] text-white md:text-5xl md:tracking-[-0.055em]">
                Directo oficial
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-100 md:self-auto md:rounded-none md:py-2 md:text-[9px] md:font-black md:uppercase md:tracking-[0.16em]">
            <span className="w-2 h-2 bg-[#e10600] animate-pulse" /> Señal de @{FOM_CHANNEL.id}
          </div>
        </div>

        <div className="relative z-10 mx-3 overflow-hidden rounded-xl border border-white/15 bg-black shadow-[0_25px_70px_rgba(0,0,0,0.6)] md:mx-8 md:rounded-none">
          <div className="bg-[#111217] px-4 md:px-5 py-3 flex justify-between items-center border-b border-white/10">
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-[#e10600]" />
              <span className="font-black text-[10px] text-white uppercase tracking-[0.12em]">{FOM_CHANNEL.label}</span>
            </div>
            <span className="text-[8px] font-mono text-white/35 uppercase tracking-[0.2em]">Twitch Live</span>
          </div>
          <div className={`w-full bg-black relative ${compact ? "aspect-video" : "aspect-video md:min-h-[32rem]"}`}>
            <iframe
              src={`https://player.twitch.tv/?channel=${FOM_CHANNEL.id}&parent=${parent}`}
              height="100%"
              width="100%"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
            />
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-2 p-3 md:flex md:flex-wrap md:px-8 md:py-5">
          <MiniLink href={`https://www.twitch.tv/${FOM_CHANNEL.id}`} icon={<Radio className="w-3.5 h-3.5" />} label="Abrir directo" />
          <MiniLink href={`https://www.twitch.tv/${FOM_CHANNEL.id}/videos`} icon={<Video className="w-3.5 h-3.5" />} label="Vídeos TV" />
          <MiniLink href={`https://www.twitch.tv/${FOM_CHANNEL.id}/clips`} icon={<MonitorPlay className="w-3.5 h-3.5" />} label="Clips" />
        </div>
      </section>

      <InterviewsSection compact={compact} />
    </div>
  );
}

function MiniLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/35 px-2 text-center text-[12px] font-bold text-white/65 backdrop-blur-sm transition-colors hover:border-[#e10600]/50 hover:text-white md:min-h-0 md:justify-start md:rounded-none md:px-3 md:py-2 md:text-[9px] md:font-black md:uppercase md:tracking-[0.16em]"
    >
      {icon}
      {label}
      <ArrowUpRight className="hidden w-3 h-3 opacity-50 md:block" />
    </a>
  );
}
