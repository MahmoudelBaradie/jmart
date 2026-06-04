'use client';
import { LucideIcon, Inbox, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface StateViewProps {
  /** Render mode */
  state: 'loading' | 'empty' | 'error';
  /** Override the default icon for empty/error states */
  icon?: LucideIcon;
  /** Override the default title */
  title?: string;
  /** Override the default description */
  description?: string;
  /** Show a retry button (typically for error state) */
  onRetry?: () => void;
  /** Compact = less vertical padding (use inside cards) */
  compact?: boolean;
}

/**
 * Unified loading / empty / error state component.
 *
 * Replaces ad-hoc spinners and skeletons with a single, accessible
 * component that includes a retry path for errors.
 *
 *   {isLoading ? <StateView state="loading" />
 *    : isError ? <StateView state="error" onRetry={refetch} />
 *    : !data?.length ? <StateView state="empty" />
 *    : <Table data={data} />}
 */
export default function StateView({
  state,
  icon,
  title,
  description,
  onRetry,
  compact = false,
}: StateViewProps) {
  const { t } = useLanguage();
  const pad = compact ? 'py-8' : 'py-16';

  if (state === 'loading') {
    return (
      <div className={`flex flex-col items-center justify-center ${pad} text-center`} role="status" aria-live="polite">
        <Loader2 size={32} className="text-brand-500 animate-spin mb-3" aria-hidden="true" />
        <p className="text-sm font-medium text-gray-700">{title ?? t.state.loading}</p>
        <p className="text-xs text-gray-400 mt-1">{description ?? t.state.loadingDesc}</p>
      </div>
    );
  }

  if (state === 'error') {
    const Icon = icon ?? AlertCircle;
    return (
      <div className={`flex flex-col items-center justify-center ${pad} text-center`} role="alert">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <Icon size={24} className="text-red-500" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-gray-900">{title ?? t.state.error}</p>
        <p className="text-xs text-gray-500 mt-1 max-w-sm">{description ?? t.state.errorDesc}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            <RefreshCw size={14} aria-hidden="true" />
            {t.state.retry}
          </button>
        )}
      </div>
    );
  }

  // empty
  const Icon = icon ?? Inbox;
  return (
    <div className={`flex flex-col items-center justify-center ${pad} text-center`}>
      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon size={24} className="text-gray-400" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-gray-900">{title ?? t.state.empty}</p>
      <p className="text-xs text-gray-500 mt-1">{description ?? t.state.emptyDesc}</p>
    </div>
  );
}
