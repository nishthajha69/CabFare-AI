import { Footprints, MapPin } from 'lucide-react';
import { AlternativePickup } from '../types/cabfare';

interface AlternativePickupsProps {
  alternatives: AlternativePickup[];
  highlightedAltId: string | null;
  onHighlightAlt: (id: string | null) => void;
  onApplyPickup: (alt: AlternativePickup) => void;
}

export function AlternativePickups({
  alternatives,
  highlightedAltId,
  onHighlightAlt,
  onApplyPickup,
}: AlternativePickupsProps) {
  return (
    <section
      aria-label="Alternative Pickup Suggestions"
      className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div>
        <h2 className="font-display text-lg font-bold text-slate-900">
          Alternative Pickup Suggestions
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Walking a few hundred meters to arterial roads or transit gates can bypass micro-zone surge fees.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-3">
        {alternatives.map((alt, idx) => {
          const isHighlighted = highlightedAltId === alt.id;
          return (
            <div
              key={alt.id}
              onMouseEnter={() => onHighlightAlt(alt.id)}
              onMouseLeave={() => onHighlightAlt(null)}
              className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${
                isHighlighted
                  ? 'border-blue-400 bg-blue-50/35'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500">
                    Option A{idx + 1} · {alt.walkMeters}m ({alt.walkMinutes} min walk)
                  </span>
                  <span className="font-mono text-sm font-bold text-emerald-700 tabular-nums">
                    Save ₹{alt.savings}
                  </span>
                </div>

                <h3 className="mt-1.5 font-display text-sm font-bold text-slate-900">
                  {alt.name}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {alt.reason}. {alt.description}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="text-xs text-slate-600 tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <Footprints className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                    Simulated est. <strong className="font-mono text-slate-900">₹{alt.newFare}</strong> on {alt.bestPlatform}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onApplyPickup(alt)}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 whitespace-nowrap"
                >
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  <span>Use Pickup</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
