export const rivalryStyles = {
  // Contenedores principales
  panel: "mt-8 border border-line p-6 relative",
  glowTop: "",
  headerBlock: "relative flex flex-col gap-2 mb-8",
  headerTitleRow: "flex items-center gap-3",
  headerIcon: "w-4 h-4 text-brand",
  headerTitle: "text-sm font-black uppercase tracking-[0.08em] text-ink",
  headerDesc: "text-xs text-ink-muted max-w-3xl font-mono",

  // Grid Layouts
  gridTop: "grid gap-6 xl:grid-cols-[0.95fr_1.05fr]",
  gridBottom: "mt-6 grid gap-4 lg:grid-cols-2",

  // Tarjetas de Pilotos y Rivales
  cardSelf: "relative border border-line bg-surface-2 p-5",
  cardRival: "relative border border-line bg-surface-2 p-5",
  glowRight: "",
  glowLeft: "",
  cardHeader: "flex items-start justify-between gap-4 mb-6",
  pilotLabel: "text-xs uppercase tracking-[0.08em] text-ink-muted font-mono",
  pilotName: "text-2xl font-black text-ink tracking-tight",
  pilotTeam: "text-xs uppercase text-ink-muted mt-1 font-mono",

  // OVR Badge
  ovrBadge: "min-w-20 border border-brand/45 bg-brand/10 px-4 py-3 text-center shadow-card",
  ovrLabel: "block text-[11px] uppercase tracking-[0.08em] text-danger/65 font-mono",
  ovrValue: "mt-1 block text-4xl font-black text-ink tabular-nums leading-none",

  // Stats internas
  statsGridMain: "grid grid-cols-3 gap-2 text-xs text-ink-2 mt-5",
  statsGridRival: "grid grid-cols-2 gap-2 text-ink-2",
  statBox: "border border-line bg-surface-2 p-3",
  statTitle: "uppercase tracking-[0.08em] font-mono text-[11px] text-ink-muted",
  statVal: "mt-2 text-xl font-black text-ink",
  statValRed: "mt-2 text-xl font-black text-brand",

  // Paneles Secundarios
  aiPanel: "border border-line p-5",
  aiHeaderRow: "flex items-center justify-between gap-3 mb-4",
  aiBadge: "inline-flex items-center gap-2 border border-brand/30 bg-brand/5 px-3 py-1 text-xs uppercase tracking-[0.08em] text-brand font-mono",
  aiHintBoxActive: "p-4 border border-brand/20 bg-brand/5",
  aiHintBoxNormal: "p-4 border border-line bg-surface-2",
  aiHintTextActive: "text-sm font-bold text-brand",
  aiHintTextNormal: "text-sm font-bold text-ink",

  // Paneles Jeque y Admin
  jequePanel: "mt-8 border border-line p-6",
  jequeHeader: "flex items-center justify-between gap-4 mb-6",
  jequeBadge: "border border-line px-3 py-2 text-xs uppercase tracking-[0.08em] text-ink-muted font-mono",
  jequeGrid: "grid gap-6 xl:grid-cols-2",
  jequeBox: "border border-line bg-surface-2 p-5",
  jequeBoxTitle: "text-xs uppercase tracking-[0.08em] text-ink-muted font-mono mb-4 flex items-center gap-2",
  jequeItem: "border border-line bg-surface-2 p-4",
  jequeSubGrid: "mt-3 grid grid-cols-2 gap-2 text-[12px] text-ink-muted",
  jequeSubBox: "border border-line bg-surface-2 p-3",

  adminGrid: "grid gap-6 xl:grid-cols-2",
  adminBox: "border border-line p-5",
  adminBoxTitle: "text-xs uppercase tracking-[0.08em] text-ink-muted font-mono mb-4 flex items-center gap-2",
  adminItem: "border border-line bg-surface-2 p-4",
  adminItemHeader: "flex items-center justify-between gap-3 mb-3 text-sm text-ink",
  adminSubItem: "border border-line bg-surface-3 p-3",

  // Tactical
  tacticalCard: "relative border border-line bg-surface-2 p-4",
  tacticalGlow: "",
  tacticalHeader: "flex justify-between items-center mb-3",
  tacticalName: "font-black text-sm text-ink uppercase tracking-tight",
  tacticalRating: "text-xs border border-line px-2 py-0.5 text-ink-muted font-mono",
  tacticalRow: "flex justify-between text-[11px] mb-1.5",
  tacticalLabel: "text-ink-muted uppercase font-mono tracking-widest",
  tacticalValue: "text-ink font-bold",
};
