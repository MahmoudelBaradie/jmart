'use client';
import Badge from '@/components/ui/Badge';
import { useLanguage } from '@/contexts/LanguageContext';

type Variant = 'default' | 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'orange' | 'teal';

interface Entry { variant: Variant; en: string; ar: string }

/**
 * Single source of truth for status labels + colors across the admin app.
 * Add new statuses here — do not invent ad-hoc badges in pages.
 *
 * Keys must match the Prisma enum values exactly. When two enums share a
 * value (e.g. Invoice.DRAFT vs Order.DRAFT) we still use the same color,
 * which is fine because the displayed label is the same word.
 */
const statusMap: Record<string, Entry> = {
  // ── Order statuses ──
  DRAFT:              { variant: 'default', en: 'Draft',           ar: 'مسودة' },
  SUBMITTED:          { variant: 'blue',    en: 'Submitted',       ar: 'مُرسَل' },
  CONFIRMED:          { variant: 'indigo',  en: 'Confirmed',       ar: 'مؤكد' },
  AWAITING_PICKUP:    { variant: 'yellow',  en: 'Awaiting Pickup', ar: 'بانتظار الاستلام' },
  DISPATCHED:         { variant: 'purple',  en: 'Dispatched',      ar: 'تم الإرسال' },
  IN_TRANSIT:         { variant: 'orange',  en: 'In Transit',      ar: 'في الطريق' },
  DELIVERED:          { variant: 'teal',    en: 'Delivered',       ar: 'تم التوصيل' },
  COMPLETED:          { variant: 'green',   en: 'Completed',       ar: 'مكتمل' },
  CANCELLED:          { variant: 'red',     en: 'Cancelled',       ar: 'ملغي' },
  SETTLED:            { variant: 'green',   en: 'Settled',         ar: 'مُسوَّى' },
  ARCHIVED:           { variant: 'default', en: 'Archived',        ar: 'مؤرشف' },
  PROCESSING:         { variant: 'indigo',  en: 'Processing',      ar: 'قيد المعالجة' },
  READY_FOR_PICKUP:   { variant: 'purple',  en: 'Ready for Pickup',ar: 'جاهز للاستلام' },

  // ── KYC ──
  PENDING_REVIEW:     { variant: 'yellow',  en: 'Pending Review',  ar: 'بانتظار المراجعة' },
  APPROVED:           { variant: 'green',   en: 'Approved',        ar: 'مقبول' },
  REJECTED:           { variant: 'red',     en: 'Rejected',        ar: 'مرفوض' },
  REQUIRES_MORE_INFO: { variant: 'orange',  en: 'More Info Needed',ar: 'يحتاج معلومات إضافية' },

  // ── User status ──
  ACTIVE:               { variant: 'green',   en: 'Active',     ar: 'نشط' },
  SUSPENDED:            { variant: 'red',     en: 'Suspended',  ar: 'موقوف' },
  PENDING_VERIFICATION: { variant: 'yellow',  en: 'Pending',    ar: 'قيد التحقق' },
  INACTIVE:             { variant: 'default', en: 'Inactive',   ar: 'غير نشط' },
  DEACTIVATED:          { variant: 'default', en: 'Deactivated',ar: 'معطّل' },

  // ── Shipment ──
  PENDING_DRIVER:   { variant: 'yellow', en: 'Pending Driver',  ar: 'بانتظار سائق' },
  DRIVER_ASSIGNED:  { variant: 'blue',   en: 'Driver Assigned', ar: 'تم تعيين سائق' },
  LOADING:          { variant: 'indigo', en: 'Loading',         ar: 'جارٍ التحميل' },

  // ── Quality ──
  PENDING:      { variant: 'yellow', en: 'Pending',      ar: 'معلق' },
  PASSED:       { variant: 'green',  en: 'Passed',       ar: 'مقبول' },
  FAILED:       { variant: 'red',    en: 'Failed',       ar: 'مرفوض' },
  PARTIAL_PASS: { variant: 'orange', en: 'Partial Pass', ar: 'مقبول جزئياً' },

  // ── Invoice ──
  ISSUED:          { variant: 'blue',    en: 'Issued',    ar: 'صادر' },
  PAID:            { variant: 'green',   en: 'Paid',      ar: 'مدفوع' },
  PARTIALLY_PAID:  { variant: 'yellow',  en: 'Partial',   ar: 'مدفوع جزئياً' },
  OVERDUE:         { variant: 'red',     en: 'Overdue',   ar: 'متأخر' },
  VOID:            { variant: 'default', en: 'Void',      ar: 'ملغي' },

  // ── Disputes ──
  FILED:        { variant: 'yellow',  en: 'Filed',        ar: 'مُقدَّم' },
  UNDER_REVIEW: { variant: 'blue',    en: 'Under Review', ar: 'قيد المراجعة' },
  RESOLVED:     { variant: 'green',   en: 'Resolved',     ar: 'محلول' },
  CLOSED:       { variant: 'default', en: 'Closed',       ar: 'مغلق' },

  // ── Tasks ──
  CREATED:     { variant: 'blue',   en: 'Created',     ar: 'مُنشأ' },
  IN_PROGRESS: { variant: 'indigo', en: 'In Progress', ar: 'قيد التنفيذ' },
  ESCALATED:   { variant: 'orange', en: 'Escalated',   ar: 'مُصعَّد' },

  // ── Lots ──
  AVAILABLE: { variant: 'green',   en: 'Available', ar: 'متاح' },
  RESERVED:  { variant: 'blue',    en: 'Reserved',  ar: 'محجوز' },
  SOLD:      { variant: 'default', en: 'Sold',      ar: 'مُباع' },
  EXPIRED:   { variant: 'red',     en: 'Expired',   ar: 'منتهي' },

  // ── Contracts ──
  PENDING_SIGNATURES: { variant: 'yellow', en: 'Pending Signatures', ar: 'بانتظار التوقيع' },
  UNDER_NEGOTIATION:  { variant: 'yellow', en: 'Negotiating',        ar: 'قيد التفاوض' },
  EXECUTION:          { variant: 'green',  en: 'In Execution',       ar: 'قيد التنفيذ' },
  TERMINATED:         { variant: 'red',    en: 'Terminated',         ar: 'منتهي' },
};

export default function StatusBadge({ status }: { status: string }) {
  const { lang } = useLanguage();
  const config = statusMap[status];
  if (!config) {
    return <Badge variant="default">{status}</Badge>;
  }
  return <Badge variant={config.variant}>{lang === 'ar' ? config.ar : config.en}</Badge>;
}
