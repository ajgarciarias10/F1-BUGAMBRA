export interface MobileTabItem {
  id: string;
  label: string;
}

export function MobileBottomTabs({
  tabs,
  activeTab,
  onTab,
}: {
  tabs: MobileTabItem[];
  activeTab: string;
  onTab: (id: string) => void;
}) {
  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 safe-bottom bg-[#09090b]/95 border-t border-white/10 backdrop-blur-xl">
      <div className="px-2 pt-2 flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTab(tab.id)}
              className={`relative min-h-12 flex-1 min-w-[5.5rem] px-3 text-[10px] font-black uppercase tracking-[0.12em] transition-all ${
                active
                  ? "bg-white text-black"
                  : "text-white/45 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
