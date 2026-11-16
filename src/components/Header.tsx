import { MessageSquare } from 'lucide-react';

export type WorkspaceTab = 'compare' | 'analytics' | 'trends' | 'alerts';

interface HeaderProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onOpenAssistant: () => void;
  triggeredAlertCount?: number;
}

const NAV_ITEMS: { id: WorkspaceTab; label: string }[] = [
  { id: 'compare', label: 'Fare Explorer' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'trends', label: 'Price Trends' },
  { id: 'alerts', label: 'Alerts & Pickups' },
];

export function Header({
  activeTab,
  onSelectTab,
  onOpenAssistant,
  triggeredAlertCount = 0,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('compare')}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md"
        >
          CabFare AI
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Primary sections"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded ${
                  isActive
                    ? 'text-blue-600 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {item.id === 'alerts' && triggeredAlertCount > 0 && (
                  <span className="ml-1.5 font-mono text-xs font-bold text-emerald-700">
                    ({triggeredAlertCount})
                  </span>
                )}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[15px] h-0.5 bg-blue-600"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action CTA */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenAssistant}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            <span>Ask Ride Assistant</span>
          </button>
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <div className="flex md:hidden items-center gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {item.label}
              {item.id === 'alerts' && triggeredAlertCount > 0 && (
                <span className="ml-1 font-mono font-bold text-emerald-700">
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
