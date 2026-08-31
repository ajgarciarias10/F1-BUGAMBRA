export const widgetStyles = {
  // Contenedores Base
  wrapper: "border border-white/[0.08] overflow-hidden",
  innerBase: "p-5 lg:p-6 relative overflow-hidden transition-all duration-300",
  neonStrip: "absolute right-0 top-0 w-0.5 h-full bg-[#e10600] pointer-events-none",
  grid: "grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch relative z-10",

  // Columnas
  colLeft: "lg:col-span-4 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/[0.06] pb-5 lg:pb-0 lg:pr-6",

  // Headers y Títulos
  tagRed: "text-[9px] uppercase tracking-[0.35em] font-mono font-bold text-[#e10600]",
  circuitName: "text-2xl font-black tracking-tight text-white uppercase mt-1",
  sectionTitle: "text-[10px] font-mono uppercase text-white/30 tracking-[0.3em] mb-3 flex items-center gap-1.5 justify-between",

  // Temporizador Cajas
  timerGrid: "grid grid-cols-4 gap-2 text-center",
  timerBox: "border border-white/[0.06] bg-white/[0.02] p-2",
  timerVal: "text-xl font-black text-white tabular-nums",
  timerLabel: "text-[8px] font-mono uppercase text-white/30",

  // Panel de Neumáticos
  aiPanel: "border border-white/[0.06] bg-white/[0.02] p-4",
  aiHeader: "font-bold text-[#e10600] text-[10px] uppercase block font-mono tracking-[0.25em] flex items-center gap-1.5",
  aiGrid: "grid grid-cols-2 gap-2 mb-3",
  aiBox: "border border-white/[0.04] bg-black/20 p-2.5 flex flex-col justify-center items-center text-center",
  aiBoxLabel: "text-[8px] uppercase tracking-wider text-white/30 font-mono mb-1",
  aiBoxVal: "font-bold text-[10px] text-white tracking-tight leading-tight",
  aiTextWrapper: "text-white/50 leading-relaxed text-[10px]",
  aiTextHighlight: "text-white/75 font-bold",

  // Technical Grid
  techGrid: "grid grid-cols-3 gap-2 mb-3 mt-3",
  techBox: "border border-white/[0.04] bg-white/[0.02] p-2 text-center flex flex-col justify-center",
  techLabel: "text-[8px] uppercase tracking-wider text-[#e10600]/70 mb-0.5 font-mono",
  techVal: "font-black text-[9px] text-white tabular-nums tracking-tighter",

  // Forecast
  forecastList: "space-y-2 font-sans",
  forecastItemBase: "flex items-center justify-between p-2.5 border transition-all",
  forecastItemActive: "bg-[#e10600]/5 border-[#e10600]/20",
  forecastItemInactive: "bg-transparent border-white/[0.05]",
  forecastIconBox: "p-1.5 border border-white/[0.06]",
  forecastDayTitle: "font-bold text-[11px] text-white",
  forecastEventTitle: "text-[9px] text-white/35 font-mono block leading-tight truncate max-w-[150px] uppercase",
  forecastTemp: "font-black text-white text-[10px]",
  forecastRain: "text-[8px] text-white/35 text-[10px]",
};
