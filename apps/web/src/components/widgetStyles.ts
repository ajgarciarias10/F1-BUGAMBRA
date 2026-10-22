export const widgetStyles = {
  wrapper: "overflow-hidden rounded-card bg-surface",
  innerBase: "relative overflow-hidden p-5 lg:p-6",
  neonStrip: "pointer-events-none absolute right-0 top-0 h-full w-0.5 bg-brand opacity-70",
  grid: "relative z-10 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12",

  colLeft: "flex flex-col justify-between border-b border-line pb-5 lg:col-span-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6",

  tagRed: "text-xs font-bold uppercase tracking-[0.12em] text-brand",
  circuitName: "mt-1 text-2xl font-bold tracking-tight text-ink",
  sectionTitle: "mb-3 flex items-center justify-between gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-ink-muted",

  timerGrid: "grid grid-cols-4 gap-2 text-center",
  timerBox: "rounded-md p-2",
  timerVal: "tabular-nums text-2xl font-bold text-ink",
  timerLabel: "text-xs uppercase text-ink-muted",

  aiPanel: "border-t border-line py-4",
  aiHeader: "flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-brand",
  aiGrid: "mb-3 grid grid-cols-2 gap-2",
  aiBox: "flex flex-col items-center justify-center rounded-md bg-surface-2 p-2.5 text-center",
  aiBoxLabel: "mb-1 text-xs uppercase text-ink-muted",
  aiBoxVal: "text-sm font-bold leading-tight text-ink",
  aiTextWrapper: "text-sm leading-relaxed text-ink-muted",
  aiTextHighlight: "font-bold text-ink",

  techGrid: "mb-3 mt-3 grid grid-cols-3 gap-2",
  techBox: "flex flex-col justify-center rounded-md bg-surface-2 p-2 text-center",
  techLabel: "mb-0.5 text-xs uppercase text-ink-muted",
  techVal: "tabular-nums text-sm font-bold text-ink",

  forecastList: "space-y-2",
  forecastItemBase: "flex items-center justify-between border-b border-line p-2.5",
  forecastItemActive: "text-brand",
  forecastItemInactive: "text-ink",
  forecastIconBox: "p-1.5",
  forecastDayTitle: "text-sm font-bold text-ink",
  forecastEventTitle: "block max-w-[150px] truncate text-xs leading-tight text-ink-muted",
  forecastTemp: "text-sm font-bold text-ink",
  forecastRain: "text-xs text-ink-muted",
};
