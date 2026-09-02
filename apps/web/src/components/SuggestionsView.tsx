import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../services/firebase";
import { 
  Sparkles, 
  MessageSquare, 
  Send, 
  ThumbsUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Filter, 
  Trash2, 
  MessageCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SuggestionsViewProps {
  isAdmin?: boolean;
}

export interface Sugerencia {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  usuario_nombre: string;
  usuario_uid: string;
  usuario_email: string;
  usuario_rol: string;
  fecha: string;
  estado: "pendiente" | "revisando" | "aprobado" | "descartado" | "completado";
  respuesta_admin?: string;
  votos?: string[]; // Array of user UIDs who voted
}

const CATEGORIES = [
  { id: "interfaz", label: "🎨 Interfaz y Diseño" },
  { id: "mercado", label: "💰 Mercado y Fichajes" },
  { id: "reglas", label: "📜 Normativa y Reglas" },
  { id: "bugs", label: "👾 Reporte de Bugs" },
  { id: "otros", label: "✨ General / Otros" }
];

const STATUS_CONFIG = {
  pendiente: {
    label: "Pendiente",
    bg: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    icon: Clock
  },
  revisando: {
    label: "En revisión",
    bg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    icon: Filter
  },
  aprobado: {
    label: "Aprobada",
    bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: CheckCircle2
  },
  descartado: {
    label: "Descartada",
    bg: "bg-red-500/10 text-red-500 border-red-500/20",
    icon: XCircle
  },
  completado: {
    label: "Completada",
    bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: Sparkles
  }
};

export function SuggestionsView({ isAdmin = false }: SuggestionsViewProps) {
  const { user, userData } = useAuth();
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", type: "" });

  // Form State
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("interfaz");
  const [submitting, setSubmitting] = useState(false);

  // Filters State
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "votes">("date");

  // Admin response states
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [adminResponseText, setAdminResponseText] = useState("");

  useEffect(() => {
    const q = collection(db, "mejoras");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sugerencia[];
      
      // Sort immediately by date descending by default
      setSugerencias(data);
      setLoading(false);
    }, (error) => {
      console.error("Error loaded suggestions snapshot:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userData) return;
    if (!titulo.trim() || !descripcion.trim()) {
      showMsg("Por favor, rellena todos los campos.", "error");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "mejoras"), {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        categoria,
        usuario_nombre: userData.nombre || "Usuario",
        usuario_uid: user.uid,
        usuario_email: user.email || "",
        usuario_rol: userData.rol || "piloto",
        fecha: new Date().toISOString(),
        estado: "pendiente",
        votos: []
      });

      setTitulo("");
      setDescripcion("");
      setCategoria("interfaz");
      showMsg("¡Sugerencia enviada correctamente! Gracias por ayudarnos a mejorar.", "success");
    } catch (err: any) {
      showMsg("Error al enviar sugerencia: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (sug: Sugerencia) => {
    if (!user) return;
    const votes = sug.votos || [];
    const hasVoted = votes.includes(user.uid);
    const docRef = doc(db, "mejoras", sug.id);

    try {
      if (hasVoted) {
        await updateDoc(docRef, {
          votos: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(docRef, {
          votos: arrayUnion(user.uid)
        });
      }
    } catch (err: any) {
      console.error("Error toggling vote:", err);
    }
  };

  const handleUpdateStatus = async (sugId: string, newStatus: Sugerencia["estado"]) => {
    try {
      const docRef = doc(db, "mejoras", sugId);
      await updateDoc(docRef, {
        estado: newStatus
      });
      showMsg("Estado de la sugerencia actualizado.", "success");
    } catch (err: any) {
      showMsg("Error al actualizar estado: " + err.message, "error");
    }
  };

  const handleSaveAdminResponse = async (sugId: string) => {
    try {
      const docRef = doc(db, "mejoras", sugId);
      await updateDoc(docRef, {
        respuesta_admin: adminResponseText.trim() || ""
      });
      setEditingResponseId(null);
      setAdminResponseText("");
      showMsg("Respuesta del administrador guardada.", "success");
    } catch (err: any) {
      showMsg("Error al guardar respuesta: " + err.message, "error");
    }
  };

  const handleDeleteSuggestion = async (sugId: string) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar esta sugerencia? Esta acción no se puede deshacer.")) return;
    try {
      await deleteDoc(doc(db, "mejoras", sugId));
      showMsg("Sugerencia eliminada permanentemente.", "success");
    } catch (err: any) {
      showMsg("Error al eliminar sugerencia: " + err.message, "error");
    }
  };

  const showMsg = (text: string, type: "success" | "error") => {
    setMsg({ text, type });
    setTimeout(() => {
      setMsg({ text: "", type: "" });
    }, 4000);
  };

  // Filter and Sort computing
  const processedSuggestions = React.useMemo(() => {
    let list = [...sugerencias];

    if (selectedCategoryFilter !== "all") {
      list = list.filter(s => s.categoria === selectedCategoryFilter);
    }

    if (selectedStatusFilter !== "all") {
      list = list.filter(s => s.estado === selectedStatusFilter);
    }

    if (sortBy === "votes") {
      list.sort((a, b) => (b.votos?.length || 0) - (a.votos?.length || 0));
    } else {
      list.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    }

    return list;
  }, [sugerencias, selectedCategoryFilter, selectedStatusFilter, sortBy]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <span className="text-xs font-mono uppercase tracking-widest text-white/30 animate-pulse">Cargando buzón de mejoras...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* LEFT COLUMN: Submit form (ONLY FOR USER VIEW) / STATS BRIEF (FOR BOTH) */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* Form panel for normal users */}
        {!isAdmin && (
          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 relative overflow-hidden shadow-xl">
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-[#e10600]/5 rounded-full blur-2xl pointer-events-none"></div>
            
            <span className="text-[9px] uppercase tracking-[0.2em] text-[#e10600] font-extrabold flex items-center gap-1 font-mono">
              <MessageSquare className="w-3.5 h-3.5" />
              PROPÓN UNA MEJORA
            </span>
            <h3 className="text-lg font-black italic uppercase text-white mt-1.5 mb-1">Buzón de Sugerencias</h3>
            <p className="text-xs text-white/40 mb-5 leading-normal uppercase font-mono">
              Tus ideas ayudan a definir el rumbo de F1 Bugambra. Sugiérenos características, reglas o reporta fallos.
            </p>

            <form onSubmit={handleCreateSuggestion} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-mono text-white/40 tracking-wider mb-1.5">Título de la mejora</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Chat general de escuderías..."
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-white placeholder-white/20 outline-none focus:border-[#e10600] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono text-white/40 tracking-wider mb-1.5">Categoría</label>
                <select
                  value={categoria}
                  onChange={e => setCategoria(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-white outline-none focus:border-[#e10600] transition-colors cursor-pointer"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono text-white/40 tracking-wider mb-1.5">Explicación detallada</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe cómo funciona tu idea, por qué es útil y cómo mejoraría el paddock..."
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-white placeholder-white/20 outline-none focus:border-[#e10600] transition-colors resize-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#e10600] hover:bg-red-700 text-white font-extrabold text-xs uppercase py-2.5 rounded-lg transition-transform active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-red-950/20"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? "Enviando..." : "Enviar Sugerencia"}
              </button>
            </form>
          </div>
        )}

        {/* Info panel / Admin guide */}
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 font-mono text-xs text-white/50 space-y-4">
          <span className="text-[9px] uppercase tracking-[0.2em] text-[#e10600] font-extrabold block">
            ESTADÍSTICAS DEL BUZÓN
          </span>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-black/20 p-2.5 rounded-lg border border-white/5 text-center">
              <span className="text-[10px] text-white/30 uppercase block mb-1">Total recibidas</span>
              <span className="text-lg font-bold text-white">{sugerencias.length}</span>
            </div>
            <div className="bg-black/20 p-2.5 rounded-lg border border-white/5 text-center">
              <span className="text-[10px] text-white/30 uppercase block mb-1">Aprobadas / Ok</span>
              <span className="text-lg font-bold text-emerald-400">
                {sugerencias.filter(s => s.estado === "aprobado" || s.estado === "completado").length}
              </span>
            </div>
          </div>

          <div className="space-y-2 border-t border-white/5 pt-3 text-[10px]">
            <p className="flex justify-between">
              <span>⏱️ Pendientes:</span>
              <span className="text-white font-bold">{sugerencias.filter(s => s.estado === "pendiente").length}</span>
            </p>
            <p className="flex justify-between">
              <span>🔍 En revisión:</span>
              <span className="text-white font-bold">{sugerencias.filter(s => s.estado === "revisando").length}</span>
            </p>
            <p className="flex justify-between">
              <span>🚀 Completadas:</span>
              <span className="text-white font-bold">{sugerencias.filter(s => s.estado === "completado").length}</span>
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: List of suggestions with filters */}
      <div className="lg:col-span-2 space-y-6">

        {/* Global messages notifications internally block */}
        <AnimatePresence>
          {msg.text && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                msg.type === "error" 
                  ? "bg-red-500/10 border-red-500/20 text-red-400" 
                  : "bg-green-500/10 border-green-500/20 text-green-400"
              }`}
            >
              {msg.type === "error" ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
              <span>{msg.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters and sorting toolbelt */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            
            {/* Category filter selects */}
            <select
              value={selectedCategoryFilter}
              onChange={e => setSelectedCategoryFilter(e.target.value)}
              className="bg-zinc-950 border border-white/10 rounded-lg text-xs py-1.5 px-2.5 text-white/70 outline-none focus:border-[#e10600] transition-colors cursor-pointer"
            >
              <option value="all">Todas las categorías</option>
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>

            {/* Status filter selects */}
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="bg-zinc-950 border border-white/10 rounded-lg text-xs py-1.5 px-2.5 text-white/70 outline-none focus:border-[#e10600] transition-colors cursor-pointer"
            >
              <option value="all">Todos los estados</option>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>

          {/* Sort order toggle buttons */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-white/5 inline-flex max-w-max">
            <button
              onClick={() => setSortBy("date")}
              className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                sortBy === "date" 
                  ? "bg-[#e10600] text-white shadow-md shadow-red-900/10" 
                  : "text-white/40 hover:text-white"
              }`}
            >
              Recientes
            </button>
            <button
              onClick={() => setSortBy("votes")}
              className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                sortBy === "votes" 
                  ? "bg-[#e10600] text-white shadow-md shadow-red-900/10" 
                  : "text-white/40 hover:text-white"
              }`}
            >
              Más Votadas 🔥
            </button>
          </div>
        </div>

        {/* Suggestions list representation */}
        <div className="space-y-4">
          {processedSuggestions.length === 0 ? (
            <div className="bg-zinc-900/10 border border-white/5 border-dashed rounded-2xl p-12 text-center text-white/30 uppercase font-mono text-xs tracking-wider">
              No se han encontrado propuestas en este buzón con los filtros actuales.
            </div>
          ) : (
            processedSuggestions.map((sug: Sugerencia) => {
              const categoryMatch = CATEGORIES.find(c => c.id === sug.categoria)?.label || "✨ General / Otros";
              const statusCfg = STATUS_CONFIG[sug.estado || "pendiente"];
              const StatusIcon = statusCfg.icon;
              const hasVoted = user ? (sug.votos || []).includes(user.uid) : false;

              return (
                <div 
                  key={sug.id} 
                  className={`bg-zinc-900/40 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all space-y-4 relative ${
                    sug.estado === "completado" ? "border-emerald-500/10 hover:border-emerald-500/20" : ""
                  }`}
                >
                  {/* Top info and status header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[8px] bg-white/5 text-white/50 border border-white/5 text-[9px] font-bold font-mono uppercase px-2 py-0.5 rounded-md">
                          {categoryMatch}
                        </span>
                        
                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest border flex items-center gap-1 font-mono ${statusCfg.bg}`}>
                          <StatusIcon className="w-3 h-3 shrink-0" />
                          {statusCfg.label}
                        </span>
                      </div>
                      
                      <h4 className="text-base font-extrabold text-white uppercase tracking-tight mt-1.5">{sug.titulo}</h4>
                    </div>

                    {/* Upvote button for regular users, layout is different */}
                    <button
                      onClick={() => handleVote(sug)}
                      disabled={!user}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all shrink-0 min-w-[45px] hover:scale-105 active:scale-95 ${
                        hasVoted 
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                          : "bg-black/30 border-white/5 text-white/30 hover:text-white/60 hover:bg-black/40"
                      }`}
                    >
                      <ThumbsUp className={`w-4 h-4 mb-1 ${hasVoted ? "fill-emerald-400" : ""}`} />
                      <span className="text-[10px] font-mono font-bold leading-none">{(sug.votos || []).length}</span>
                    </button>
                  </div>

                  {/* Suggestion Text Description */}
                  <p className="text-xs text-white/70 leading-relaxed font-sans bg-black/25 rounded-xl p-3 border border-white/5 whitespace-pre-wrap">
                    {sug.descripcion}
                  </p>

                  {/* Author meta statistics line */}
                  <div className="flex flex-wrap justify-between items-center text-[9px] font-mono uppercase text-white/30 border-t border-white/5 pt-3.5">
                    <div>
                      <span>Propuesta por: </span>
                      <span className="text-white font-bold">{sug.usuario_nombre}</span>
                      <span className="mx-1 text-white/10">|</span>
                      <span className="text-[#e10600] font-semibold">{sug.usuario_rol}</span>
                    </div>
                    <div>
                      {new Date(sug.fecha).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </div>
                  </div>

                  {/* Administrator custom response block */}
                  {(sug.respuesta_admin || editingResponseId === sug.id) ? (
                    <div className="bg-red-500/5 border border-[#e10600]/10 rounded-xl p-3.5 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-[9px] font-mono text-[#e10600] font-extrabold uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5 animate-pulse" />
                          RESPUESTA DE LA ADMINISTRACIÓN
                        </span>
                        {isAdmin && editingResponseId !== sug.id && (
                          <button
                            onClick={() => {
                              setEditingResponseId(sug.id);
                              setAdminResponseText(sug.respuesta_admin || "");
                            }}
                            className="bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded text-[8px] uppercase font-bold text-white transition-colors"
                          >
                            Editar
                          </button>
                        )}
                      </div>

                      {editingResponseId === sug.id ? (
                        <div className="space-y-2 mt-2">
                          <textarea
                            value={adminResponseText}
                            onChange={e => setAdminResponseText(e.target.value)}
                            rows={3}
                            placeholder="Escribe una respuesta técnica o de planificación sobre esta sugerencia..."
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-white/25 outline-none focus:border-[#e10600] transition-colors leading-relaxed"
                          />
                          <div className="flex justify-end gap-2 text-[9px] font-bold uppercase font-mono">
                            <button
                              onClick={() => {
                                setEditingResponseId(null);
                                setAdminResponseText("");
                              }}
                              className="px-2.5 py-1 text-white/50 hover:text-white"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveAdminResponse(sug.id)}
                              className="bg-[#e10600] text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors"
                            >
                              Guardar Respuesta
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-white/80 leading-relaxed italic pr-4">
                          "{sug.respuesta_admin}"
                        </p>
                      )}
                    </div>
                  ) : null}

                  {/* ADMIN ACTION PANEL FOR STATUS & ACTION CONTROL */}
                  {isAdmin && (
                    <div className="border-t border-white/5 pt-3 flex flex-wrap justify-between items-center gap-3 bg-black/10 p-3 rounded-xl border border-white/[0.03]">
                      
                      {/* State transitions */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[8px] font-mono text-white/30 uppercase mr-1">Administrar:</span>
                        {Object.keys(STATUS_CONFIG).map((stKey) => {
                          const isCurrent = sug.estado === stKey;
                          return (
                            <button
                              key={stKey}
                              type="button"
                              onClick={() => handleUpdateStatus(sug.id, stKey as any)}
                              className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all tracking-wide ${
                                isCurrent 
                                  ? "bg-white/10 text-white border border-white/20 font-black shadow-inner" 
                                  : "bg-black/40 text-white/30 hover:text-white/60 hover:bg-black/60 border border-white/5 pointer-events-auto"
                              }`}
                            >
                              {STATUS_CONFIG[stKey as keyof typeof STATUS_CONFIG].label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Admin support operations */}
                      <div className="flex items-center gap-2">
                        {!sug.respuesta_admin && editingResponseId !== sug.id && (
                          <button
                            onClick={() => {
                              setEditingResponseId(sug.id);
                              setAdminResponseText("");
                            }}
                            className="text-[9px] font-bold uppercase bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <MessageCircle className="w-3 h-3" />
                            Responder
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteSuggestion(sug.id)}
                          className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 p-1 rounded-md transition-colors"
                          title="Eliminar propuesta permanentemente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
