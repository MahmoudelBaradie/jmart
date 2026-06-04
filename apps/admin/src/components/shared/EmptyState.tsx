import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  /** Optional secondary text. Kept as an alias for `description` for backwards-compat with older call sites. */
  subtitle?: string;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No results',
  description,
  subtitle,
}: EmptyStateProps) {
  const body = description ?? subtitle ?? 'Nothing to show here yet.';
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon size={24} className="text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="text-xs text-gray-500 mt-1">{body}</p>
    </div>
  );
}
