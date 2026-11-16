import { RefreshCw, TrendingDown } from 'lucide-react';
import { AIActionType, AIRecommendation } from '../types/cabfare';

interface AIRecommendationCardProps {
  recommendation: AIRecommendation | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onAskAssistant?: () => void;
}

function getActionAccent(action: AIActionType): {
  bannerBg: string;
  actionColor: string;
  borderColor: string;
} {
  switch (action) {
    case 'Book Now':
      return {
        bannerBg: 'bg-emerald-50/70',
        actionColor: 'text-emerald-700',
        borderColor: 'border-emerald-200',
      };
    case 'Wait 10 Minutes':
      return {
        bannerBg: 'bg-amber-50/70',
        actionColor: 'text-amber-700',
        borderColor: 'border-amber-200',
      };
    case 'Consider Another Platform':
    case 'Choose Another Platform':
      return {
        bannerBg: 'bg-blue-50/70',
        actionColor: 'text-blue-700',
        borderColor: 'border-blue-200',
      };
    case 'Cheapest Available Ride':
    default:
      return {
        bannerBg: 'bg-emerald-50/70',
        actionColor: 'text-emerald-700',
        borderColor: 'border-emerald-200',
      };
  }
}

export function AIRecommendationCard({
  recommendation,
  isLoading,
  error,
  onRefresh,
  onAskAssistant,
}: AIRecommendationCardProps) {
  return (
    <section
      aria-label="AI Ride Recommendation"
      className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-900">
              AI Recommendation Engine
            </h2>
            <p className="text-xs text-slate-500">
              {recommendation?.source === 'gemini'
                ? 'Powered by Gemini decision analysis'
                : 'Quantitative pricing & surge timing analysis'}
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{isLoading ? 'Analyzing...' : 'Re-analyze'}</span>
          </button>
        </div>

        {isLoading && !recommendation ? (
          <div className="mt-4 space-y-3 animate-pulse">
            <div className="h-14 rounded-lg bg-slate-100" />
            <div className="h-4 w-5/6 rounded bg-slate-100" />
            <div className="h-4 w-4/6 rounded bg-slate-100" />
          </div>
        ) : error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            <p className="font-semibold">Unable to load recommendation</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : recommendation ? (
          <div className="mt-4 space-y-3.5">
            {/* Primary Action Banner */}
            {(() => {
              const style = getActionAccent(recommendation.action);
              return (
                <div className={`rounded-lg border p-3.5 ${style.bannerBg} ${style.borderColor}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <span className="block text-xs font-medium text-slate-600">
                        Recommended Action
                      </span>
                      <span className={`font-display text-xl font-bold ${style.actionColor}`}>
                        {recommendation.action}
                      </span>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <span className="block text-xs text-slate-600">
                        {recommendation.recommendedVehicle || recommendation.recommendedPlatform}
                      </span>
                      <span className="text-lg font-bold text-slate-900">
                        ₹{recommendation.estimatedFare}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Reasoning */}
            <p className="text-sm leading-relaxed text-slate-700">
              {recommendation.reasoning}
            </p>

            {/* Key Quantitative Factors */}
            {recommendation.keyFactors.length > 0 && (
              <ul className="space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                {recommendation.keyFactors.map((factor, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <TrendingDown
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600"
                      aria-hidden="true"
                    />
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            )}

            {recommendation.notice && (
              <p className="rounded-md bg-slate-50 px-2.5 py-2 text-[11px] leading-snug text-slate-500">
                {recommendation.notice}
              </p>
            )}
          </div>
        ) : null}
      </div>

      {recommendation && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 tabular-nums">
          <span>
            Potential Savings:{' '}
            <strong className="font-mono text-emerald-700">₹{recommendation.potentialSavings}</strong>
            {' · '}
            {recommendation.confidenceLabel}
          </span>
          {onAskAssistant && (
            <button
              type="button"
              onClick={onAskAssistant}
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              Ask Ride Assistant →
            </button>
          )}
        </div>
      )}
    </section>
  );
}
