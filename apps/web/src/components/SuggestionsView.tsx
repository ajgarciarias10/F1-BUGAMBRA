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
import { useConfirm } from "./Feedback";
import { useSingleFlight } from "../hooks/useSingleFlight";

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
    bg: "bg-surface-3 text-ink-muted border-line",
    icon: Clock
  },
  revisando: {
    label: "En revisión",
    bg: "bg-warn/10 text-warn border-warn/20",
    icon: Filter
  },
  aprobado: {
    label: "Aprobada",
    bg: "bg-ok/10 text-ok border-ok/20",
    icon: CheckCircle2
  },
  descartado: {
    label: "Descartada",
    bg: "bg-danger/10 text-danger border-danger/20",
    icon: XCircle
  },
  completado: {
    label: "Completada",
    bg: "bg-info/10 text-info border-info/20",
    icon: Sparkles
  }
};

export function SuggestionsView({ isAdmin = false }: SuggestionsViewProps) {
  const { user, userData } = useAuth();
  const { confirm, confirmDialog } = useConfirm();
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

  const { run: runOnce } = useSingleFlight();
  const handleCreateSuggestion = async (e: React.FormEvent) => {
    return runOnce(async () => {
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
    });
  };

  const handleVote = async (sug: Sugerencia) => {
    return runOnce(async () => {
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
    });
  };

  const handleUpdateStatus = async (sugId: string, newStatus: Sugerencia["estado"]) => {
    return runOnce(async () => {
    try {
      const docRef = doc(db, "mejoras", sugId);
      await updateDoc(docRef, {
        estado: newStatus
      });
      showMsg("Estado de la sugerencia actualizado.", "success");
    } catch (err: any) {
      showMsg("Error al actualizar estado: " + err.message, "error");
    }
    });
  };

  const handleSaveAdminResponse = async (sugId: string) => {
    return runOnce(async () => {
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
    });
  };

  const handleDeleteSuggestion = async (sugId: string) => {
    return runOnce(async () => {
    const ok = await confirm({
      title: "Eliminar sugerencia",
      body: "La sugerencia y sus votos se borran para siempre. No se puede deshacer.",
      confirmLabel: "Eliminar",
      tone: "peligro",
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "mejoras", sugId));
      showMsg("Sugerencia eliminada permanentemente.", "success");
    } catch (err: any) {
      showMsg("Error al eliminar sugerencia: " + err.message, "error");
    }
    });
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
        <span className="text-xs font-mono uppercase tracking-widest text-ink-muted animate-pulse">Cargando buzón de mejoras...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-8">
      
      {/* LEFT COLUMN: Submit form (ONLY FOR USER VIEW) / STATS BRIEF (FOR BOTH) */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* Form panel for normal users */}
        {!isAdmin && (
          <div className="bg-surface-2 border border-line rounded-2xl p-5 relative overflow-hidden shadow-xl">
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-brand/5 rounded-full blur-2xl pointer-events-none"></div>
            
            <span className="text-[11px] uppercase tracking-[0.08em] text-brand font-extrabold flex items-center gap-1 font-mono">
              <MessageSquare className="w-3.5 h-3.5" />
              PROPÓN UNA MEJORA
            </span>
            <h3 className="text-lg font-black italic uppercase text-ink mt-1.5 mb-1">Buzón de Sugerencias</h3>
            <p className="text-xs text-ink-muted mb-5 leading-normal uppercase font-mono">
              Tus ideas ayudan a definir el rumbo de F1 Bugambra. Sugiérenos características, reglas o reporta fallos.
            </p>

            <form onSubmit={handleCreateSuggestion} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-mono text-ink-muted tracking-wider mb-1.5">Título de la mejora</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Chat general de escuderías..."
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  className="min-h-12 w-full rounded-lg border border-line bg-surface-3 px-3 text-ink transition-colors placeholder:text-ink-muted focus:border-brand focus:outline-none md:min-h-0 md:py-2 md:text-xs"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-mono text-ink-muted tracking-wider mb-1.5">Categoría</label>
                <select
                  value={categoria}
                  onChange={e => setCategoria(e.target.value)}
                  className="min-h-12 w-full cursor-pointer rounded-lg border border-line bg-surface-3 px-3 text-ink transition-colors focus:border-brand focus:outline-none md:min-h-0 md:py-2 md:text-xs"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase font-mono text-ink-muted tracking-wider mb-1.5">Explicación detallada</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe cómo funciona tu idea, por qué es útil y cómo mejoraría el paddock..."
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  className="w-full resize-none rounded-lg border border-line bg-surface-3 px-3 py-2.5 leading-relaxed text-ink transition-colors placeholder:text-ink-muted focus:border-brand focus:outline-none md:text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex min-h-13 w-full items-center justify-center gap-1.5 rounded-lg bg-brand text-sm font-extrabold uppercase text-brand-ink shadow-lg shadow-danger/20 transition-transform hover:bg-danger active:scale-95 md:min-h-0 md:py-2.5 md:text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? "Enviando..." : "Enviar Sugerencia"}
              </button>
            </form>
          </div>
        )}

        {/* Info panel / Admin guide */}
        <div className="bg-surface-2 border border-line rounded-2xl p-5 font-mono text-xs text-ink-muted space-y-4">
          <span className="text-[11px] uppercase tracking-[0.08em] text-brand font-extrabold block">
            ESTADÍSTICAS DEL BUZÓN
          </span>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-surface-3 p-2.5 rounded-lg border border-line text-center">
              <span className="text-xs text-ink-muted uppercase block mb-1">Total recibidas</span>
              <span className="text-lg font-bold text-ink">{sugerencias.length}</span>
            </div>
            <div className="bg-surface-3 p-2.5 rounded-lg border border-line text-center">
              <span className="text-xs text-ink-muted uppercase block mb-1">Aprobadas / Ok</span>
              <span className="text-lg font-bold text-ok">
                {sugerencias.filter(s => s.estado === "aprobado" || s.estado === "completado").length}
              </span>
            </div>
          </div>

          <div className="space-y-2 border-t border-line pt-3 text-xs">
            <p className="flex justify-between">
              <span>⏱️ Pendientes:</span>
              <span className="text-ink font-bold">{sugerencias.filter(s => s.estado === "pendiente").length}</span>
            </p>
            <p className="flex justify-between">
              <span>🔍 En revisión:</span>
              <span className="text-ink font-bold">{sugerencias.filter(s => s.estado === "revisando").length}</span>
            </p>
            <p className="flex justify-between">
              <span>🚀 Completadas:</span>
              <span className="text-ink font-bold">{sugerencias.filter(s => s.estado === "completado").length}</span>
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
                  ? "bg-danger/10 border-danger/20 text-danger" 
                  : "bg-ok/10 border-ok/20 text-ok"
              }`}
            >
              {msg.type === "error" ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
              <span>{msg.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters and sorting toolbelt */}
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-line bg-surface-2 p-4 md:flex-row md:items-center md:gap-4">
          <div className="flex flex-wrap gap-2">
            
            {/* Category filter selects */}
            <select
              value={selectedCategoryFilter}
              onChange={e => setSelectedCategoryFilter(e.target.value)}
              className="min-h-11 cursor-pointer rounded-lg border border-line bg-surface-2 px-2.5 text-ink-2 transition-colors focus:border-brand focus:outline-none md:min-h-0 md:py-1.5 md:text-xs"
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
              className="min-h-11 cursor-pointer rounded-lg border border-line bg-surface-2 px-2.5 text-ink-2 transition-colors focus:border-brand focus:outline-none md:min-h-0 md:py-1.5 md:text-xs"
            >
              <option value="all">Todos los estados</option>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>

          {/* Sort order toggle buttons */}
          <div className="flex items-center gap-1.5 bg-surface-3 p-1 rounded-lg border border-line inline-flex max-w-max">
            <button
              onClick={() => setSortBy("date")}
              className={`px-3 py-1 rounded text-xs font-bold uppercase transition-all whitespace-nowrap ${
                sortBy === "date" 
                  ? "bg-brand text-brand-ink shadow-md shadow-danger/20" 
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Recientes
            </button>
            <button
              onClick={() => setSortBy("votes")}
              className={`px-3 py-1 rounded text-xs font-bold uppercase transition-all whitespace-nowrap ${
                sortBy === "votes" 
                  ? "bg-brand text-brand-ink shadow-md shadow-danger/20" 
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Más Votadas 🔥
            </button>
          </div>
        </div>

        {/* Suggestions list representation */}
        <div className="space-y-4">
          {processedSuggestions.length === 0 ? (
            <div className="bg-surface-2 border border-line border-dashed rounded-2xl p-12 text-center text-ink-muted uppercase font-mono text-xs tracking-wider">
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
                  className={`bg-surface-2 border border-line rounded-2xl p-5 hover:border-line transition-all space-y-4 relative ${
                    sug.estado === "completado" ? "border-ok/10 hover:border-ok/20" : ""
                  }`}
                >
                  {/* Top info and status header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] bg-surface-2 text-ink-muted border border-line text-[11px] font-bold font-mono uppercase px-2 py-0.5 rounded-md">
                          {categoryMatch}
                        </span>
                        
                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-widest border flex items-center gap-1 font-mono ${statusCfg.bg}`}>
                          <StatusIcon className="w-3 h-3 shrink-0" />
                          {statusCfg.label}
                        </span>
                      </div>
                      
                      <h4 className="text-base font-extrabold text-ink uppercase tracking-tight mt-1.5">{sug.titulo}</h4>
                    </div>

                    {/* Upvote button for regular users, layout is different */}
                    <button
                      onClick={() => handleVote(sug)}
                      disabled={!user}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all shrink-0 min-w-[45px] hover:scale-105 active:scale-95 ${
                        hasVoted 
                          ? "bg-ok/10 border-ok/30 text-ok" 
                          : "bg-surface-3 border-line text-ink-muted hover:text-ink-muted hover:bg-surface-3"
                      }`}
                    >
                      <ThumbsUp className={`w-4 h-4 mb-1 ${hasVoted ? "fill-ok" : ""}`} />
                      <span className="text-xs font-mono font-bold leading-none">{(sug.votos || []).length}</span>
                    </button>
                  </div>

                  {/* Suggestion Text Description */}
                  <p className="whitespace-pre-wrap rounded-xl border border-line bg-surface-3 p-3 font-sans text-[14px] leading-relaxed text-ink-2 md:text-xs">
                    {sug.descripcion}
                  </p>

                  {/* Author meta statistics line */}
                  <div className="flex flex-wrap justify-between items-center text-[11px] font-mono uppercase text-ink-muted border-t border-line pt-3.5">
                    <div>
                      <span>Propuesta por: </span>
                      <span className="text-ink font-bold">{sug.usuario_nombre}</span>
                      <span className="mx-1 text-ink-muted">|</span>
                      <span className="text-brand font-semibold">{sug.usuario_rol}</span>
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
                    <div className="bg-danger/5 border border-brand/10 rounded-xl p-3.5 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-[11px] font-mono text-brand font-extrabold uppercase tracking-wider">
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
                            className="bg-surface-2 hover:bg-surface-2 px-2 py-0.5 rounded text-[11px] uppercase font-bold text-ink transition-colors"
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
                            className="w-full bg-surface-3 border border-line rounded-lg p-2 text-xs text-ink placeholder:text-ink-muted outline-none focus:border-brand transition-colors leading-relaxed"
                          />
                          <div className="flex justify-end gap-2 text-[11px] font-bold uppercase font-mono">
                            <button
                              onClick={() => {
                                setEditingResponseId(null);
                                setAdminResponseText("");
                              }}
                              className="px-2.5 py-1 text-ink-muted hover:text-ink"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveAdminResponse(sug.id)}
                              className="bg-brand text-brand-ink px-3 py-1 rounded-md hover:bg-danger transition-colors"
                            >
                              Guardar Respuesta
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-ink-2 leading-relaxed italic pr-4">
                          "{sug.respuesta_admin}"
                        </p>
                      )}
                    </div>
                  ) : null}

                  {/* ADMIN ACTION PANEL FOR STATUS & ACTION CONTROL */}
                  {isAdmin && (
                    <div className="border-t border-line pt-3 flex flex-wrap justify-between items-center gap-3 bg-surface-2 p-3 rounded-xl border">
                      
                      {/* State transitions */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-mono text-ink-muted uppercase mr-1">Administrar:</span>
                        {Object.keys(STATUS_CONFIG).map((stKey) => {
                          const isCurrent = sug.estado === stKey;
                          return (
                            <button
                              key={stKey}
                              type="button"
                              onClick={() => handleUpdateStatus(sug.id, stKey as any)}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase transition-all tracking-wide ${
                                isCurrent 
                                  ? "bg-surface-2 text-ink border border-line-strong font-black shadow-inner" 
                                  : "bg-surface-3 text-ink-muted hover:text-ink-muted hover:bg-ink/60 border border-line pointer-events-auto"
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
                            className="text-[11px] font-bold uppercase bg-ok/10 hover:bg-ok/20 text-ok border border-ok/20 px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <MessageCircle className="w-3 h-3" />
                            Responder
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteSuggestion(sug.id)}
                          className="bg-danger/10 hover:bg-danger/20 border border-danger/20 text-danger p-1 rounded-md transition-colors"
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

      {confirmDialog}
    </div>
  );
}
