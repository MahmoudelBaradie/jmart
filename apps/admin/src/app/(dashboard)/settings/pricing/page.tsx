'use client';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pricingApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { DollarSign, CheckCircle2, AlertCircle, Info } from 'lucide-react';

type PricingMode = 'STRICT' | 'HYBRID' | 'REFERENCE';
type OutOfRangeAction = 'SUSPEND' | 'SNAP' | 'WARN';

const MODE_DESCRIPTIONS: Record<PricingMode, { title: string; desc: string }> = {
  STRICT: {
    title: 'صارم (STRICT)',
    desc: 'السعر داخل النطاق إلزامي. المزارع لا يستطيع وضع سعر خارج [أدنى - أقصى].',
  },
  HYBRID: {
    title: 'هجين (HYBRID) — موصى به',
    desc: 'النطاق توصية. المزارع يستطيع الخروج لكن العرض يُعلَّم بـ "خارج النطاق" للمشتري.',
  },
  REFERENCE: {
    title: 'مرجعي (REFERENCE)',
    desc: 'لا قيود. السعر المركزي للعرض فقط. المزارع حر تمامًا. النظام يعرض الفرق %.',
  },
};

const OOR_DESCRIPTIONS: Record<OutOfRangeAction, { title: string; desc: string }> = {
  SUSPEND: { title: 'تعطيل (SUSPEND)', desc: 'العرض يُخفى من السوق تلقائيًا + إشعار للمزارع.' },
  SNAP:    { title: 'تعديل تلقائي (SNAP)', desc: 'السعر يُعدَّل لأقرب حد + إشعار.' },
  WARN:    { title: 'تحذير فقط (WARN)', desc: 'العرض يبقى ظاهرًا. تحذير في dashboard المزارع.' },
};

export default function PricingSettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['pricing-settings'],
    queryFn: () => pricingApi.getSettings().then((r: any) => r.data?.data ?? r.data),
  });

  const [mode, setMode] = useState<PricingMode>('HYBRID');
  const [flex, setFlex] = useState<string>('5');
  const [oor, setOor] = useState<OutOfRangeAction>('WARN');

  // Hydrate local state once the server settings load. We keep a local copy
  // so the user can experiment with toggles before pressing Save.
  useEffect(() => {
    if (data) {
      setMode(data.pricingMode);
      setFlex(String(data.defaultFlexibilityPct));
      setOor(data.outOfRangeAction);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => pricingApi.updateSettings({
      pricingMode: mode,
      defaultFlexibilityPct: parseFloat(flex),
      outOfRangeAction: oor,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-settings'] }),
  });

  if (isLoading) return <PageSpinner />;

  const flexNum = parseFloat(flex);
  const flexValid = !isNaN(flexNum) && flexNum >= 0 && flexNum <= 100;
  const dirty =
    mode !== data?.pricingMode ||
    flexNum !== Number(data?.defaultFlexibilityPct) ||
    oor !== data?.outOfRangeAction;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-2">
        <DollarSign size={20} className="text-brand-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">إعدادات التسعير</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            الإعدادات الافتراضية لكل المنتجات — يمكن تجاوزها على مستوى الفئة أو المنتج.
          </p>
        </div>
      </div>

      {/* Pricing mode */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Info size={14} className="text-blue-500" />
          نمط التسعير الافتراضي
        </h2>
        <div className="space-y-2">
          {(Object.keys(MODE_DESCRIPTIONS) as PricingMode[]).map((m) => (
            <label
              key={m}
              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                mode === m ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="mode"
                value={m}
                checked={mode === m}
                onChange={(e) => setMode(e.target.value as PricingMode)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-bold text-sm text-gray-900">{MODE_DESCRIPTIONS[m].title}</div>
                <div className="text-xs text-gray-600 mt-0.5">{MODE_DESCRIPTIONS[m].desc}</div>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Flexibility % */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-3">نسبة المرونة الافتراضية</h2>
        <p className="text-xs text-gray-500 mb-3">
          المزارع يستطيع وضع سعر بين <strong>السعر المركزي × (1 − النسبة)</strong>
          {' '}و<strong>السعر المركزي × (1 + النسبة)</strong>.
          {' '}مثال: سعر مركزي 40 ر.س + مرونة 5% → النطاق 38.00 إلى 42.00 ر.س.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={flex}
            onChange={(e) => setFlex(e.target.value)}
            min={0} max={100} step={0.5}
            className={`w-28 border rounded-lg px-3 py-2 text-sm ${
              flexValid ? 'border-gray-300' : 'border-red-300 bg-red-50'
            }`}
          />
          <span className="text-sm text-gray-700 font-bold">±%</span>
          {!flexValid && (
            <span className="text-xs text-red-600">يجب أن تكون بين 0 و 100</span>
          )}
        </div>
      </Card>

      {/* Out-of-range action */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <AlertCircle size={14} className="text-amber-500" />
          السلوك عند خروج عرض مزارع عن النطاق
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          يحدث عند تحديث السعر المركزي إذا أصبح سعر المزارع خارج النطاق الجديد.
        </p>
        <div className="space-y-2">
          {(Object.keys(OOR_DESCRIPTIONS) as OutOfRangeAction[]).map((a) => (
            <label
              key={a}
              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                oor === a ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="oor"
                value={a}
                checked={oor === a}
                onChange={(e) => setOor(e.target.value as OutOfRangeAction)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-bold text-sm text-gray-900">{OOR_DESCRIPTIONS[a].title}</div>
                <div className="text-xs text-gray-600 mt-0.5">{OOR_DESCRIPTIONS[a].desc}</div>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Sticky save bar */}
      <div className="sticky bottom-4 bg-white border border-gray-200 rounded-xl shadow-lg p-3 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {save.isSuccess && !dirty && (
            <span className="flex items-center gap-1 text-green-700">
              <CheckCircle2 size={14} /> تم الحفظ — آخر تحديث {new Date(data.updatedAt).toLocaleString('ar-SA')}
            </span>
          )}
          {(save.error as any) && (
            <span className="text-red-600">
              فشل الحفظ: {(save.error as any)?.response?.data?.message?.[0] ?? 'خطأ'}
            </span>
          )}
        </div>
        <Button
          onClick={() => save.mutate()}
          loading={save.isPending}
          disabled={!dirty || !flexValid}
        >
          {dirty ? 'حفظ التغييرات' : 'محفوظ'}
        </Button>
      </div>
    </div>
  );
}
