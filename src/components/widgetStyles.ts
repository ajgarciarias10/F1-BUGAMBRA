export const widgetStyles = {
  // Contenedores Base
  wrapper: "p-0.5 rounded-2xl bg-gradient-to-b from-white/10 to-transparent shadow-2xl overflow-hidden",
  innerBase: "rounded-[15px] p-6 lg:p-7 relative overflow-hidden transition-all duration-500",
  neonStrip: "absolute right-0 top-0 w-2 h-full bg-gradient-to-b from-[#e10600] to-[#e10600]/10 pointer-events-none",
  grid: "grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative z-10",
  
  // Columnas
  colLeft: "lg:col-span-4 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10 pb-6 lg:pb-0 lg:pr-6",

  // Headers y Títulos
  tagRed: "text-[9px] uppercase tracking-[0.25em] font-black text-[#e10600] bg-[#e10600]/10 px-2 py-0.5 rounded",
  circuitName: "text-3xl font-black italic tracking-tighter text-white uppercase mt-1",
  sectionTitle: "text-xs font-mono uppercase text-white/40 tracking-wider mb-3 flex items-center gap-1.5 justify-between",
  
  // Temporizador Cajas
  timerGrid: "grid grid-cols-4 gap-2 text-center",
  timerBox: "bg-white/5 border border-white/5 p-2 rounded-xl",
  timerVal: "text-xl font-extrabold text-white tabular-nums",
  timerLabel: "text-[8px] font-mono uppercase text-white/40",

  // Panel de Neumáticos (Estrategia AI)
  aiPanel: "bg-white/[0.02] border border-white/5 rounded-xl p-4",
  aiHeader: "font-extrabold text-[#e10600] text-[10px] uppercase block font-mono tracking-wider flex items-center gap-1.5",
  aiGrid: "grid grid-cols-2 gap-3 mb-3",
  aiBox: "bg-black/30 border border-white/5 rounded-lg p-2.5 flex flex-col justify-center items-center text-center",
  aiBoxLabel: "text-[8px] uppercase tracking-wider text-white/40 mb-1",
  aiBoxVal: "font-bold text-[10px] text-white tracking-tight leading-tight",
  aiTextWrapper: "text-white/60 leading-relaxed text-[10px]",
  aiTextHighlight: "text-white/80 font-bold",

  // Technical Grid
  techGrid: "grid grid-cols-3 gap-2 mb-3 mt-3",
  techBox: "bg-white/[0.02] border border-white/5 rounded-lg p-2 text-center flex flex-col justify-center",
  techLabel: "text-[8px] uppercase tracking-wider text-[#e10600]/80 mb-0.5 font-mono",
  techVal: "font-black text-[9px] text-white tabular-nums tracking-tighter",

  // Forecast Fin de Semana
  forecastList: "space-y-2.5 font-sans",
  forecastItemBase: "flex items-center justify-between p-2.5 rounded-xl border transition-all",
  forecastItemActive: "bg-[#e10600]/5 border-[#e10600]/20",
  forecastItemInactive: "bg-white/[0.01] border-white/5",
  forecastIconBox: "p-1.5 bg-black/40 rounded-lg",
  forecastDayTitle: "font-extrabold text-[11px] text-white",
  forecastEventTitle: "text-[9px] text-white/40 font-mono block leading-tight truncate max-w-[150px] uppercase",
  forecastTemp: "font-black text-white text-[10px]",
  forecastRain: "text-[8px] text-white/40 text-[10px]"
};