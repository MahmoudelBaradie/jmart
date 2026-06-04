'use client';
import { Gavel, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/**
 * Auctions — Coming Soon.
 *
 * The backend `/auctions` controller is intentionally stubbed (returns 501).
 * We do NOT call it here to avoid noisy error states; instead we show a
 * clean "coming soon" UI so the feature appears as planned, not broken.
 */
export default function AuctionsPage() {
  return (
    <div className="sm:p-6 min-h-[70vh] flex items-center justify-center" dir="rtl">
      <div className="max-w-md w-full text-center bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-gray-100">
        <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
          <Gavel size={36} className="text-amber-600" aria-hidden="true" />
        </div>

        <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-full mb-4">
          <Sparkles size={11} />
          قريباً
        </div>

        <h1 className="text-xl font-black text-gray-900 mb-2">المزادات</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          نعمل على إطلاق نظام مزادات يتيح للمزارعين عرض إنتاجهم للمزاد والمشترين تقديم عروضهم بشفافية.
          ابق متابعاً — سنُعلن عند الإطلاق.
        </p>

        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <ArrowLeft size={14} />
          العودة إلى السوق
        </Link>
      </div>
    </div>
  );
}
