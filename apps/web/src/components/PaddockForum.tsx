import { useEffect, useState } from "react";
import { addDoc, collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";
import { Image, MessageCircle, Send, Video } from "lucide-react";
import { compressAndConvertImage } from "../utils/imageHelper";

interface PaddockPost { id: string; author: string; authorPhoto?: string; text: string; mediaUrl?: string; mediaType?: "image" | "video"; createdAt: string; }

export function PaddockForum({ readOnly = false }: { readOnly?: boolean }) {
  const { user, userData } = useAuth();
  const [posts, setPosts] = useState<PaddockPost[]>([]);
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => onSnapshot(query(collection(db, "paddock_posts"), orderBy("createdAt", "desc")), snapshot => {
    setPosts(snapshot.docs.map(item => ({ id: item.id, ...item.data() })) as PaddockPost[]);
  }), []);

  const publish = async () => {
    if (!user || !userData || (!text.trim() && !mediaUrl)) return;
    setPublishing(true);
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
    } finally { setPublishing(false); }
  };

  const attachImage = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setMediaUrl(await compressAndConvertImage(file, 900, 900, 0.8));
    setMediaType("image");
  };

  return <section className="space-y-5">
    <header className="m-card border border-white/10 bg-white/[0.03] p-4 md:p-5">
      <div className="flex items-center gap-3"><MessageCircle className="w-5 h-5 text-[#e10600]" /><span className="text-[12px] font-black text-[#e10600] md:font-mono md:text-[9px] md:uppercase md:tracking-[0.35em]">Paddock Social</span></div>
      <h2 className="mt-2 text-xl font-black uppercase md:text-2xl">El muro de la parrilla</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-white/50 md:text-sm">Publica tus declaraciones, reacciones y rumores. El paddock te está leyendo.</p>
    </header>
    {!readOnly && <div className="m-card border border-white/10 bg-[#111217] p-4">
      <textarea value={text} onChange={event => setText(event.target.value)} placeholder="¿Qué se comenta en tu box?" maxLength={500} className="w-full min-h-28 resize-y rounded-xl border border-white/10 bg-black/30 p-3 text-base text-white outline-none focus:border-[#e10600] md:rounded-none md:text-sm" />
      <div className="mt-3 grid gap-2 md:flex md:flex-wrap md:items-center">
        <label className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 px-3 text-[13px] font-bold text-white/70 hover:text-white md:min-h-0 md:justify-start md:rounded-none md:py-2 md:text-[10px] md:font-black md:uppercase md:tracking-wider"><Image className="w-4 h-4" /> Foto<input type="file" accept="image/*" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) attachImage(file); }} /></label>
        <input value={mediaType === "video" ? mediaUrl : ""} onChange={event => { setMediaUrl(event.target.value); setMediaType("video"); }} placeholder="URL de vídeo" className="min-h-12 w-full flex-1 rounded-xl border border-white/10 bg-black/30 px-3 text-white outline-none focus:border-[#e10600] md:min-h-0 md:w-auto md:min-w-48 md:rounded-none md:py-2 md:text-xs" />
        <Video className="hidden w-4 h-4 text-white/30 md:block" />
        <button onClick={publish} disabled={publishing || (!text.trim() && !mediaUrl)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#e10600] px-4 text-sm font-bold text-white disabled:opacity-35 md:min-h-0 md:rounded-none md:py-2 md:text-[10px] md:font-black md:uppercase md:tracking-wider"><Send className="w-3.5 h-3.5" /> {publishing ? "Publicando" : "Publicar"}</button>
      </div>
      {mediaUrl && mediaType === "image" && <img src={mediaUrl} alt="Vista previa" className="mt-3 max-h-72 max-w-full object-contain border border-white/10" />}
    </div>}
    <div className="space-y-3">{posts.map(post => <article key={post.id} className="m-card border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full overflow-hidden bg-white/10 border border-white/10">{post.authorPhoto ? <img src={post.authorPhoto} alt="" className="w-full h-full object-cover" /> : null}</div><div><p className="font-black uppercase text-sm">{post.author}</p><time className="text-[12px] text-white/40 md:font-mono md:text-[9px] md:text-white/30">{new Date(post.createdAt).toLocaleString("es-ES")}</time></div></div>
      {post.text && <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-white/80 md:text-sm">{post.text}</p>}
      {post.mediaUrl && (post.mediaType === "video" ? <a href={post.mediaUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#e10600] md:min-h-0 md:text-xs"><Video className="w-4 h-4" /> Ver vídeo</a> : <img src={post.mediaUrl} alt="Publicación del paddock" loading="lazy" className="mt-3 max-h-96 max-w-full rounded-xl object-contain md:rounded-none" />)}
    </article>)}</div>
  </section>;
}
