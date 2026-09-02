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
    <header className="border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-3"><MessageCircle className="w-5 h-5 text-[#e10600]" /><span className="text-[9px] font-mono uppercase tracking-[0.35em] text-[#e10600]">Paddock Social</span></div>
      <h2 className="mt-2 text-2xl font-black uppercase">El muro de la parrilla</h2>
      <p className="mt-1 text-sm text-white/45">Publica tus declaraciones, reacciones y rumores. El paddock te está leyendo.</p>
    </header>
    {!readOnly && <div className="border border-white/10 bg-[#111217] p-4">
      <textarea value={text} onChange={event => setText(event.target.value)} placeholder="¿Qué se comenta en tu box?" maxLength={500} className="w-full min-h-24 resize-y bg-black/30 border border-white/10 p-3 text-sm text-white outline-none focus:border-[#e10600]" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white/60 hover:text-white cursor-pointer"><Image className="w-4 h-4" /> Foto<input type="file" accept="image/*" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) attachImage(file); }} /></label>
        <input value={mediaType === "video" ? mediaUrl : ""} onChange={event => { setMediaUrl(event.target.value); setMediaType("video"); }} placeholder="URL de vídeo" className="flex-1 min-w-48 bg-black/30 border border-white/10 px-3 py-2 text-xs text-white outline-none focus:border-[#e10600]" />
        <Video className="w-4 h-4 text-white/30" />
        <button onClick={publish} disabled={publishing || (!text.trim() && !mediaUrl)} className="inline-flex items-center gap-2 bg-[#e10600] px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-35"><Send className="w-3.5 h-3.5" /> {publishing ? "Publicando" : "Publicar"}</button>
      </div>
      {mediaUrl && mediaType === "image" && <img src={mediaUrl} alt="Vista previa" className="mt-3 max-h-72 max-w-full object-contain border border-white/10" />}
    </div>}
    <div className="space-y-3">{posts.map(post => <article key={post.id} className="border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full overflow-hidden bg-white/10 border border-white/10">{post.authorPhoto ? <img src={post.authorPhoto} alt="" className="w-full h-full object-cover" /> : null}</div><div><p className="font-black uppercase text-sm">{post.author}</p><time className="text-[9px] font-mono text-white/30">{new Date(post.createdAt).toLocaleString("es-ES")}</time></div></div>
      {post.text && <p className="mt-3 text-sm text-white/75 whitespace-pre-wrap leading-relaxed">{post.text}</p>}
      {post.mediaUrl && (post.mediaType === "video" ? <a href={post.mediaUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-[#e10600] text-xs font-bold"><Video className="w-4 h-4" /> Ver vídeo</a> : <img src={post.mediaUrl} alt="Publicación del paddock" className="mt-3 max-h-96 max-w-full object-contain" />)}
    </article>)}</div>
  </section>;
}
