import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date?: string | Date | null): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';          // guard invalid date strings
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(d);
}

export function formatCurrency(amount?: number | null): string {
  if (amount == null || isNaN(amount)) return '—'; // guard NaN too
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency', currency: 'SAR', maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n?: number | null): string {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('ar-SA').format(n);
}

export function timeAgo(date: string): string {
  if (!date) return '—';
  const ms = Date.now() - new Date(date).getTime();
  if (isNaN(ms)) return '—';                    // guard invalid date strings
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1)  return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours  < 24)  return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

export function getInitials(name?: string): string {
  if (!name?.trim()) return '?';
  return name
    .split(' ')
    .map((w) => w.charAt(0))          // charAt(0) always returns '' not undefined
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}
