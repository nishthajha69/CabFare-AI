import { PlatformId } from '../types/cabfare';

interface ProviderLogoProps {
  platformId: PlatformId;
  size?: 'sm' | 'md';
}

export function ProviderLogo({ platformId, size = 'md' }: ProviderLogoProps) {
  const dims = size === 'sm' ? 'h-7 w-7 rounded-md' : 'h-9 w-9 rounded-lg';

  switch (platformId) {
    case 'uber':
      return (
        <span
          aria-hidden="true"
          className={`inline-flex shrink-0 items-center justify-center bg-slate-950 text-white ${dims}`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M7 6.5v6.2a5 5 0 0 0 10 0V6.5"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </span>
      );
    case 'ola':
      return (
        <span
          aria-hidden="true"
          className={`inline-flex shrink-0 items-center justify-center bg-slate-900 text-lime-400 ${dims}`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="3.2" />
            <circle cx="12" cy="12" r="2" fill="#FFFFFF" />
          </svg>
        </span>
      );
    case 'rapido':
      return (
        <span
          aria-hidden="true"
          className={`inline-flex shrink-0 items-center justify-center bg-amber-400 text-slate-950 ${dims}`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M13.5 4.5 7 13h4.5l-1 6.5L17 11h-4.5l1-6.5Z"
              fill="currentColor"
            />
          </svg>
        </span>
      );
    case 'blusmart':
      return (
        <span
          aria-hidden="true"
          className={`inline-flex shrink-0 items-center justify-center bg-sky-600 text-white ${dims}`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M12 4.5c4.2 0 7.5 3.3 7.5 7.5s-3.3 7.5-7.5 7.5S4.5 16.2 4.5 12"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M12.5 8.5 9.5 12.5h3l-1 3.5 3.5-4.5h-3l.5-3Z"
              fill="currentColor"
            />
          </svg>
        </span>
      );
    case 'namma_yatri':
      return (
        <span
          aria-hidden="true"
          className={`inline-flex shrink-0 items-center justify-center bg-emerald-600 text-white ${dims}`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M6.5 16V8.2c0-.4.5-.6.8-.3l9.4 8.2c.3.3.8.1.8-.3V8"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      );
    case 'meru':
      return (
        <span
          aria-hidden="true"
          className={`inline-flex shrink-0 items-center justify-center bg-cyan-700 text-white ${dims}`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M5.5 16.5V8l6.5 6 6.5-6v8.5"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      );
    case 'goamiles':
      return (
        <span
          aria-hidden="true"
          className={`inline-flex shrink-0 items-center justify-center bg-teal-600 text-white ${dims}`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M16.5 8.5A5.5 5.5 0 1 0 17 14h-4.5"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      );
  }
}
