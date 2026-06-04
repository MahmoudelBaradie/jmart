export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatCurrency(amount?: number | null): string {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ر.س`;
}

export function formatNumber(n?: number | null): string {
  if (n == null) return '—';
  return Number(n).toLocaleString('ar-SA');
}

/**
 * Unified status map for mobile. Matches the bilingual map used in admin
 * (apps/admin/src/components/shared/StatusBadge.tsx) — but mobile is
 * Arabic-only so we expose only ar labels here.
 *
 * Keep keys in sync with Prisma enum values.
 */
const NEUTRAL  = { bg: '#f3f4f6', text: '#374151' }; // gray
const SUCCESS  = { bg: '#dcfce7', text: '#14532d' }; // green
const INFO     = { bg: '#dbeafe', text: '#1e40af' }; // blue
const PURPLE   = { bg: '#f3e8ff', text: '#581c87' }; // indigo/purple
const WARNING  = { bg: '#fef9c3', text: '#854d0e' }; // yellow
const ORANGE   = { bg: '#ffedd5', text: '#9a3412' }; // orange
const DANGER   = { bg: '#fee2e2', text: '#7f1d1d' }; // red
const TEAL     = { bg: '#ccfbf1', text: '#115e59' }; // teal

const STATUS_MAP: Record<string, { color: { bg: string; text: string }; label: string }> = {
  // Orders / lifecycle
  DRAFT:              { color: NEUTRAL, label: 'مسودة' },
  SUBMITTED:          { color: INFO,    label: 'مُرسَل' },
  PENDING:            { color: WARNING, label: 'معلق' },
  CONFIRMED:          { color: INFO,    label: 'مؤكد' },
  PROCESSING:         { color: PURPLE,  label: 'قيد المعالجة' },
  AWAITING_PICKUP:    { color: WARNING, label: 'بانتظار الاستلام' },
  READY_FOR_PICKUP:   { color: PURPLE,  label: 'جاهز للاستلام' },
  DISPATCHED:         { color: PURPLE,  label: 'تم الإرسال' },
  IN_TRANSIT:         { color: ORANGE,  label: 'في الطريق' },
  DELIVERED:          { color: TEAL,    label: 'تم التوصيل' },
  COMPLETED:          { color: SUCCESS, label: 'مكتمل' },
  CANCELLED:          { color: DANGER,  label: 'ملغي' },
  REJECTED:           { color: DANGER,  label: 'مرفوض' },
  FAILED:             { color: DANGER,  label: 'فشل' },

  // KYC / users
  ACTIVE:             { color: SUCCESS, label: 'نشط' },
  APPROVED:           { color: SUCCESS, label: 'مقبول' },
  PENDING_REVIEW:     { color: WARNING, label: 'بانتظار المراجعة' },
  REQUIRES_MORE_INFO: { color: ORANGE,  label: 'يحتاج معلومات' },
  SUSPENDED:          { color: DANGER,  label: 'موقوف' },
  INACTIVE:           { color: NEUTRAL, label: 'غير نشط' },

  // Quality
  PASSED:             { color: SUCCESS, label: 'مقبول' },
  PARTIAL_PASS:       { color: ORANGE,  label: 'مقبول جزئياً' },

  // Lots
  AVAILABLE:          { color: SUCCESS, label: 'متاح' },
  RESERVED:           { color: INFO,    label: 'محجوز' },
  SOLD:               { color: NEUTRAL, label: 'مُباع' },
  EXPIRED:            { color: DANGER,  label: 'منتهي' },

  // Invoices
  ISSUED:             { color: INFO,    label: 'صادر' },
  PAID:               { color: SUCCESS, label: 'مدفوع' },
  PARTIALLY_PAID:     { color: WARNING, label: 'مدفوع جزئياً' },
  OVERDUE:            { color: DANGER,  label: 'متأخر' },
  VOID:               { color: NEUTRAL, label: 'ملغي' },

  // Contracts
  SIGNED:             { color: SUCCESS, label: 'موقَّع' },
  PENDING_SIGNATURES: { color: WARNING, label: 'بانتظار التوقيع' },
  UNDER_NEGOTIATION:  { color: WARNING, label: 'قيد التفاوض' },
  EXECUTION:          { color: SUCCESS, label: 'قيد التنفيذ' },
  TERMINATED:         { color: DANGER,  label: 'منتهي' },

  // Disputes
  FILED:              { color: WARNING, label: 'مُقدَّم' },
  UNDER_REVIEW:       { color: INFO,    label: 'قيد المراجعة' },
  RESOLVED:           { color: SUCCESS, label: 'محلول' },
  CLOSED:             { color: NEUTRAL, label: 'مغلق' },
  OPEN:               { color: WARNING, label: 'مفتوح' },

  // Tasks
  CREATED:            { color: INFO,    label: 'مُنشأ' },
  IN_PROGRESS:        { color: PURPLE,  label: 'قيد التنفيذ' },
  ESCALATED:          { color: ORANGE,  label: 'مُصعَّد' },
};

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = Object.fromEntries(
  Object.entries(STATUS_MAP).map(([k, v]) => [k, v.color]),
);

export function statusLabel(status: string): string {
  return STATUS_MAP[status]?.label ?? status;
}
