import { RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { sendAssistantMessage } from '../services/api';
import { AIRecommendation, ChatMessage, FareComparisonResponse } from '../types/cabfare';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  comparison: FareComparisonResponse | null;
  recommendation?: AIRecommendation | null;
  targetFare?: number;
}

const SUGGESTED_QUESTIONS = [
  'Which cab is cheapest for my route?',
  'Should I book now or wait?',
  'Which platform offers the best value?',
  'How much can I save by choosing another cab?',
  'Is waiting 15 minutes likely to reduce the fare?',
];

function renderFormattedText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

function buildClientNetworkFallback(
  comparison: FareComparisonResponse | null,
  recommendation?: AIRecommendation | null
): string {
  if (!comparison) {
    return 'I could not reach the assistant endpoint right now. Please select a pickup and destination and click Compare Prices to load simulated route estimates.';
  }
  const { route, summary, farePredictions } = comparison;
  const p10 = farePredictions.find((p) => p.minutesAhead === 10);
  const p30 = farePredictions.find((p) => p.minutesAhead === 30);

  return (
    `Showing offline summary from your loaded route data for **${route.pickup.area} → ${route.drop.area}** (${route.roadDistanceKm} km, ~${route.estimatedDurationMin} min): ` +
    `cheapest cab is **${summary.cheapestCabPlatform}** at **₹${summary.cheapestCabFare}** (saving **₹${summary.estimatedSavings}** vs ${summary.highestPlatform} at ₹${summary.highestFare}). ` +
    (recommendation
      ? `Current AI verdict is **${recommendation.action}** (${recommendation.recommendedPlatform} at ₹${recommendation.estimatedFare}). `
      : '') +
    `Forecast averages over 10–30 min range from ₹${p10?.expectedFare ?? summary.averageFare} to ₹${p30?.expectedFare ?? summary.averageFare}. ` +
    'Note: Figures are simulated estimates, not live provider prices.'
  );
}

export function AIAssistantDrawer({
  isOpen,
  onClose,
  comparison,
  recommendation,
  targetFare,
}: AIAssistantDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hi! I am your CabFare AI Ride Assistant. Ask me which cab is cheapest, whether to book now or wait 15 minutes, or how much you can save using your current route’s simulated fare estimates and predictions.',
      timestamp: new Date().toISOString(),
      source: 'analytical-fallback',
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [noticeBanner, setNoticeBanner] = useState<string | null>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (promptText?: string) => {
    const text = (promptText ?? input).trim();
    if (!text || isSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!promptText) setInput('');
    setIsSending(true);
    setNoticeBanner(null);

    try {
      const res = await sendAssistantMessage(
        text,
        nextHistory,
        comparison ?? undefined,
        targetFare,
        recommendation
      );
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
        source: res.source,
        notice: res.notice,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (res.notice) {
        setNoticeBanner(res.notice);
      }
    } catch (err) {
      const errText =
        err instanceof Error ? err.message : 'Unable to reach AI Ride Assistant endpoint.';
      setNoticeBanner(`${errText} Showing local route fallback summary.`);
      const fallbackMsg: ChatMessage = {
        id: `assistant-fallback-${Date.now()}`,
        role: 'assistant',
        content: buildClientNetworkFallback(comparison, recommendation),
        timestamp: new Date().toISOString(),
        source: 'analytical-fallback',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleReset = () => {
    setNoticeBanner(null);
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content:
          'Conversation cleared. Ask any question about cheapest rides, booking vs waiting, platform value, or potential savings for your active route.',
        timestamp: new Date().toISOString(),
        source: 'analytical-fallback',
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/35 backdrop-blur-[1px]">
      <div
        role="dialog"
        aria-label="CabFare AI Ride Assistant"
        className="flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
              <h2 className="font-display text-base font-bold text-slate-900">
                CabFare AI Ride Assistant
              </h2>
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500 tabular-nums">
              {comparison
                ? `${comparison.route.pickup.area} → ${comparison.route.drop.area} · ${comparison.route.roadDistanceKm} km · ~${comparison.route.estimatedDurationMin} min (${comparison.route.rideMode === 'scheduled' ? 'Scheduled' : 'Immediate'})`
                : 'Smart booking & simulated fare advisor'}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Grounded in simulated route fares, predictions &amp; AI recommendations — not live provider APIs.
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              title="Reset conversation"
              aria-label="Reset conversation"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Ride Assistant"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Active Context Snapshot Strip */}
        {comparison && (
          <div className="grid grid-cols-3 gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 text-[11px] tabular-nums">
            <div>
              <span className="block text-slate-500">Cheapest Cab</span>
              <span className="font-semibold text-emerald-700">
                {comparison.summary.cheapestCabPlatform} · ₹{comparison.summary.cheapestCabFare}
              </span>
            </div>
            <div>
              <span className="block text-slate-500">AI Verdict</span>
              <span className="font-semibold text-blue-700">
                {recommendation?.action ?? 'Analyzing'}
              </span>
            </div>
            <div>
              <span className="block text-slate-500">Max Savings</span>
              <span className="font-mono font-semibold text-slate-900">
                ₹{comparison.summary.estimatedSavings} ({comparison.summary.savingsPercent}%)
              </span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 bg-slate-50 text-slate-800'
                }`}
              >
                {msg.role === 'user' ? msg.content : renderFormattedText(msg.content)}
              </div>
              {msg.role === 'assistant' && msg.id !== 'welcome' && msg.id !== 'welcome-reset' && (
                <span className="mt-1 px-1 text-[10px] text-slate-400">
                  {msg.source === 'gemini'
                    ? 'Gemini AI · Simulated fare data'
                    : 'Analytical Advisor · Simulated fare data'}
                </span>
              )}
            </div>
          ))}

          {isSending && (
            <div className="flex justify-start">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">
                Analyzing route fares &amp; 10–30 min forecasts...
              </div>
            </div>
          )}

          {noticeBanner && (
            <div
              role="status"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800"
            >
              {noticeBanner}
            </div>
          )}
          <div ref={scrollEndRef} />
        </div>

        {/* Suggested Questions */}
        <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-2.5">
          <p className="mb-1.5 text-xs font-medium text-slate-500">Suggested questions</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={isSending}
                onClick={() => handleSend(q)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-left text-xs text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input + Send Button */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="border-t border-slate-200 bg-white p-4"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about cheapest cab, waiting 15 min, or savings..."
              aria-label="Ask Ride Assistant"
              className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              aria-label="Send message"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
