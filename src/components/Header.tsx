import {
  BarChart3,
  BellRing,
  CarFront,
  Compass,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import type { ComponentType } from 'react';

export type WorkspaceTab = 'compare' | 'saferide' | 'analytics' | 'trends' | 'alerts';

interface HeaderProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onOpenAssistant: () => void;
  triggeredAlertCount?: number;
  womenSafetyMode?: boolean;
}

const NAV_ITEMS: {
  id: WorkspaceTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { id: 'compare', label: 'Fare Explorer', icon: Compass },
  { id: 'saferide', label: 'SafeRide', icon: ShieldCheck },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'trends', label: 'Price Trends', icon: TrendingUp },
  { id: 'alerts', label: 'Alerts & Pickups', icon: BellRing },
];

export function Header({
  activeTab,
  onSelectTab,
  onOpenAssistant,
  triggeredAlertCount = 0,
  womenSafetyMode = false,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#1E2F54] bg-[#14213D]/95 text-white backdrop-blur-md shadow-[0_4px_20px_-6px_rgba(14,23,43,0.35)]">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 sm:gap-6 px-4 py-3 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Logo & Wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('compare')}
          className="group inline-flex items-center gap-2.5 rounded-lg py-0.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B8A9]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00B8A9]/15 border border-[#00B8A9]/35 text-[#00B8A9] transition-colors group-hover:bg-[#00B8A9]/25">
            <CarFront className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex flex-col items-start text-left leading-none">
            <span className="font-display text-[17px] font-bold tracking-tight text-white">
              CabFare <span className="text-[#00B8A9]">AI</span>
            </span>
            <span className="hidden sm:block mt-0.5 text-[10px] font-medium tracking-wider uppercase text-slate-300/80">
              Pan-India Mobility
            </span>
          </span>
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Primary sections"
          className="hidden lg:flex items-center gap-1.5 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isSafeRide = item.id === 'saferide';
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-2 whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B8A9] ${
                  isActive
                    ? isSafeRide
                      ? 'bg-[#8B5CF6]/20 text-white font-semibold'
                      : 'bg-white/10 text-white font-semibold'
                    : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    isSafeRide
                      ? isActive || womenSafetyMode
                        ? 'text-[#C4B5FD]'
                        : 'text-slate-300'
                      : isActive
                        ? 'text-[#00B8A9]'
                        : 'text-slate-400'
                  }`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
                {isSafeRide && womenSafetyMode && (
                  <span className="rounded bg-[#8B5CF6] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    On
                  </span>
                )}
                {item.id === 'alerts' && triggeredAlertCount > 0 && (
                  <span className="ml-0.5 rounded bg-[#00B8A9] px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#14213D]">
                    {triggeredAlertCount}
                  </span>
                )}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-2.5 -bottom-[13px] h-[2.5px] rounded-full ${
                      isSafeRide ? 'bg-[#8B5CF6]' : 'bg-[#00B8A9]'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Quick SOS Jump + Primary Assistant CTA */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onSelectTab('saferide')}
            title="Open SafeRide SOS & Women's Safety Hub"
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/50 bg-red-500/20 px-2.5 sm:px-3 py-2 text-xs font-bold text-red-100 transition-colors hover:bg-red-500/35 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            <ShieldAlert className="h-4 w-4 text-red-300" aria-hidden="true" />
            <span>SOS</span>
          </button>

          <button
            type="button"
            onClick={onOpenAssistant}
            className="inline-flex items-center gap-2 rounded-lg bg-[#00B8A9] px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-[#14213D] transition-all duration-150 hover:bg-[#19CCBD] active:scale-[0.99] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#14213D] shadow-sm"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            <span className="hidden xs:inline sm:inline">Ask Ride Assistant</span>
            <span className="sm:hidden">AI Help</span>
          </button>
        </div>
      </div>

      {/* Compact tablet & mobile navigation row */}
      <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto border-t border-white/10 bg-[#0E172B]/80 px-4 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isSafeRide = item.id === 'saferide';
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? isSafeRide
                    ? 'bg-[#8B5CF6] text-white font-semibold'
                    : 'bg-[#00B8A9] text-[#14213D] font-semibold'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{item.label}</span>
              {item.id === 'alerts' && triggeredAlertCount > 0 && (
                <span className="ml-0.5 font-mono text-[11px] font-bold">
                  ({triggeredAlertCount})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}
