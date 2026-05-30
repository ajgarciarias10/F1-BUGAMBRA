export const rivalryStyles = {
  // Contenedores principales
  panel: "mt-8 bg-zinc-900/70 border border-white/10 rounded-[2rem] p-6 shadow-2xl overflow-hidden relative",
  glowTop: "absolute inset-x-0 -top-10 h-32 bg-gradient-to-b from-[#e10600]/10 via-transparent to-transparent pointer-events-none",
  headerBlock: "relative flex flex-col gap-2 mb-6",
  headerTitleRow: "flex items-center gap-3",
  headerIcon: "w-5 h-5 text-[#e10600]",
  headerTitle: "text-lg font-bold uppercase tracking-[0.18em] text-white",
  headerDesc: "text-sm text-white/50 max-w-3xl",
  
  // Grid Layouts
  gridTop: "grid gap-6 xl:grid-cols-[0.95fr_1.05fr]",
  gridBottom: "mt-6 grid gap-4 lg:grid-cols-2",

  // Tarjetas de Pilotos y Rivales
  cardSelf: "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black/80 to-zinc-900 p-5 shadow-2xl",
  cardRival: "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-black/80 to-zinc-900 p-5 shadow-2xl",
  glowRight: "absolute right-0 top-0 h-full w-40 bg-[#e10600]/10 blur-3xl pointer-events-none",
  glowLeft: "absolute left-0 top-0 h-full w-28 bg-[#e10600]/10 blur-2xl pointer-events-none",
  cardHeader: "flex items-start justify-between gap-4 mb-6",
  pilotLabel: "text-[10px] uppercase tracking-[0.3em] text-white/40",
  pilotName: "text-3xl font-black text-white tracking-tight",
  pilotTeam: "text-xs uppercase text-white/40 mt-1",
  
  // OVR Badge
  ovrBadge: "rounded-full bg-white/5 border border-white/10 px-4 py-3 text-center shadow-lg shadow-black/20 cursor-help",
  ovrLabel: "block text-[9px] uppercase tracking-[0.3em] text-white/40",
  ovrValue: "mt-2 block text-5xl font-black text-white",
  
  // Stats internas
  statsGridMain: "grid grid-cols-3 gap-3 text-xs text-white/70 mt-6",
  statsGridRival: "grid grid-cols-2 gap-3 text-white/70",
  statBox: "rounded-3xl bg-white/5 p-4 border border-white/10",
  statTitle: "uppercase tracking-[0.22em] font-bold text-[10px] text-white/60",
  statVal: "mt-2 text-2xl font-semibold text-white",
  statValRed: "mt-2 text-2xl font-semibold text-[#e10600]",

  // Paneles Secundarios (Asistente AI)
  aiPanel: "bg-black/50 border border-white/10 rounded-[2rem] p-5",
  aiHeaderRow: "flex items-center justify-between gap-3 mb-4",
  aiBadge: "inline-flex items-center gap-2 rounded-full bg-[#e10600]/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[#e10600]",
  aiHintBoxActive: "rounded-3xl p-4 bg-[#e10600]/10 border border-[#e10600]/20",
  aiHintBoxNormal: "rounded-3xl p-4 bg-white/5",
  aiHintTextActive: "text-sm font-semibold text-[#e10600]",
  aiHintTextNormal: "text-sm font-bold text-white",

  // Estilos para Paneles Jeque y Admin
  jequePanel: "mt-8 bg-zinc-900/60 border border-white/10 rounded-3xl p-6 shadow-xl",
  jequeHeader: "flex items-center justify-between gap-4 mb-6",
  jequeBadge: "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.24em] text-white/60",
  jequeGrid: "grid gap-6 xl:grid-cols-2",
  jequeBox: "bg-black/50 border border-white/10 rounded-3xl p-5",
  jequeBoxTitle: "text-[11px] uppercase tracking-[0.24em] text-white/40 mb-4 flex items-center gap-2",
  jequeItem: "rounded-3xl bg-white/5 p-4",
  jequeSubGrid: "mt-3 grid grid-cols-2 gap-3 text-[12px] text-white/70",
  jequeSubBox: "rounded-2xl bg-white/5 p-3",
  
  adminGrid: "grid gap-6 xl:grid-cols-2",
  adminBox: "rounded-3xl bg-black/50 border border-white/10 p-5",
  adminBoxTitle: "text-[11px] uppercase tracking-[0.24em] text-white/40 mb-4 flex items-center gap-2",
  adminItem: "rounded-3xl bg-white/5 p-4 border border-white/5",
  adminItemHeader: "flex items-center justify-between gap-3 mb-3 text-sm text-white",
  adminSubItem: "rounded-2xl bg-black/70 p-3",

  // Tactical Board Styles
  tacticalCard: "relative overflow-hidden rounded-2xl bg-zinc-900 border border-white/5 p-4",
  tacticalGlow: "absolute top-0 right-0 w-24 h-24 bg-[#e10600]/5 blur-2xl pointer-events-none",
  tacticalHeader: "flex justify-between items-center mb-3",
  tacticalName: "font-black text-sm text-white uppercase tracking-tight",
  tacticalRating: "text-[10px] bg-white/10 px-2 py-0.5 rounded text-white font-mono",
  tacticalRow: "flex justify-between text-[11px] mb-1.5",
  tacticalLabel: "text-white/40 uppercase font-mono tracking-widest",
  tacticalValue: "text-white font-bold",
};