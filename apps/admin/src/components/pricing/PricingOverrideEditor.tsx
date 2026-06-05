'use client';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pricingApi } from '@/lib/api';
import { PageSpinner } from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import { Info, X } from 'lucide-react';

type PricingMode = 'STRICT' | 'HYBRID' | 'REFERENCE';
type OutOfRangeAction = 'SUSPEND' | 'SNAP' | 'WARN';

/**
 * Reusable pricing override editor — works for both Product Category and Product.
 *
 * Why a single component:
 *  - The shape of the overrides is identical: { mode | flex | OOR }.
 *  - The resolution rules are also identical (cascade through layers).
 *  - The only difference is the API endpoint and how we display the
 *    "effective" preview row.
 *
 * "Inherit" radio = field is null in the DB. Picking an explicit option
 * stores a concrete value and breaks inheritance from the level above.
 *
 * For PRODUCT entities we also surface what the CATEGORY level would yield,
 * so the admin sees "if I clear this, you fall back to: HYBRID 7%" instead
 * of having to mentally walk the chain.
 */
export interface PricingOverrideEditorProps {
  entityType: 'category' | 'product';
  entityId: string;
  entityName: string;
  onClose: () => void;
}

const MODE_LABELS: Record<PricingMode, string> = {
  STRICT: 'STRICT — صارم',
  HYBRID: 'HYBRID — هجين',
  REFERENCE: 'REFERENCE — مرجعي',
};
const OOR_LABELS: Record<OutOfRangeAction, string> = {
  SUSPEND: 'SUSPEND — تعطيل',
  SNAP: 'SNAP — تعديل تلقائي',
  WARN: 'WARN — تحذير فقط',
};

export default function PricingOverrideEditor({ entityType, entityId, entityName, onClose }: PricingOverrideEditorProps) {
  const qc = useQueryClient();

  // For both entity types we want:
  //  - what the resolved config IS right now
  //  - what the overrides on this entity are (so we can render the form)
  //  - what the system default is (for the "inherits → X" hints)
  const { data, isLoading } = useQuery({
    queryKey: ['pricing-config', entityType, entityId],
    queryFn: async () => {
      const [resolved, settings] = await Promise.all([
        entityType === 'category'
          ? pricingApi.resolveCategory(entityId).then((r: any) => r.data?.data ?? r.data)
          : pricingApi.resolveProduct(entityId).then((r: any) => r.data?.data ?? r.data),
        pricingApi.getSettings().then((r: any) => r.data?.data ?? r.data),
      ]);
      return { resolved, settings };
    },
  });

  // Form state. `null` => inherit from parent layer.
  const [mode, setMode] = useState<PricingMode | null>(null);
  const [flex, setFlex] = useState<string>('');
  const [oor, setOor] = useState<OutOfRangeAction | null>(null);

  useEffect(() => {
    if (!data) return;
    if (entityType === 'category') {
      setMode(data.resolved.overrides.mode);
      setFlex(data.resolved.overrides.flexibilityPct !== null ? String(data.resolved.overrides.flexibilityPct) : '');
      setOor(data.resolved.overrides.outOfRangeAction);
    } else {
      // For products, the resolve endpoint returns the effective values
      // along with `*From` markers indicating origin. We treat anything
      // with `*From === 'product'` as a current override.
      const r = data.resolved;
      setMode(r.modeFrom === 'product' ? r.mode : null);
      setFlex(r.flexibilityFrom === 'product' ? String(r.flexibilityPct) : '');
      setOor(r.outOfRangeFrom === 'product' ? r.outOfRangeAction : null);
    }
  }, [data, entityType]);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        pricingModeOverride: mode,
        flexibilityPctOverride: flex === '' ? null : parseFloat(flex),
        outOfRangeActionOverride: oor,
      };
      return entityType === 'category'
        ? pricingApi.setCategoryOverride(entityId, payload)
        : pricingApi.setProductOverride(entityId, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pricing-config', entityType, entityId] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
  });

  if (isLoading || !data) return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-8"><PageSpinner /></div>
    </div>
  );

  // Effective preview: what would this entity USE right now? Useful as a
  // sanity check while the admin is choosing overrides.
  const effective = entityType === 'category' ? data.resolved.effective : {
    mode: data.resolved.mode,
    flexibilityPct: data.resolved.flexibilityPct,
    outOfRangeAction: data.resolved.outOfRangeAction,
  };
  const sysDefault = entityType === 'category' ? data.resolved.systemDefault : {
    mode: data.settings.pricingMode,
    flexibilityPct: Number(data.settings.defaultFlexibilityPct),
    outOfRangeAction: data.settings.outOfRangeAction,
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <div>
            <h2 className="font-bold text-gray-900">إعدادات التسعير</h2>
            <p className="text-xs text-gray-500 mt-0.5">{entityType === 'category' ? 'فئة' : 'منتج'}: {entityName}</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Effective preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-900">
              <div className="font-bold mb-1">المعطيات المطبّقة حالياً:</div>
              <div>النمط: <strong>{MODE_LABELS[effective.mode as PricingMode]}</strong></div>
              <div>المرونة: <strong>±{effective.flexibilityPct}%</strong></div>
              <div>السلوك خارج النطاق: <strong>{OOR_LABELS[effective.outOfRangeAction as OutOfRangeAction]}</strong></div>
            </div>
          </div>

          {/* Mode */}
          <OverrideField
            label="نمط التسعير"
            value={mode}
            onChange={setMode as any}
            options={['STRICT', 'HYBRID', 'REFERENCE'] as PricingMode[]}
            labelMap={MODE_LABELS as any}
            inheritedValue={sysDefault.mode as string}
          />

          {/* Flexibility */}
          <div>
            <label className="text-sm font-bold text-gray-900 block mb-2">نسبة المرونة</label>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={flex === ''} onChange={() => setFlex('')} />
                <span className="text-sm text-gray-700">موروثة (افتراضي النظام: <strong>{sysDefault.flexibilityPct}%</strong>)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={flex !== ''} onChange={() => setFlex(String(sysDefault.flexibilityPct))} />
                <span className="text-sm text-gray-700">تخصيص:</span>
                <input
                  type="number" min={0} max={100} step={0.5}
                  value={flex}
                  onChange={(e) => setFlex(e.target.value)}
                  onFocus={() => { if (flex === '') setFlex(String(sysDefault.flexibilityPct)); }}
                  className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                  disabled={flex === ''}
                />
                <span className="text-sm font-bold text-gray-700">±%</span>
              </label>
            </div>
          </div>

          {/* Out-of-range */}
          <OverrideField
            label="السلوك عند خروج عرض المزارع عن النطاق"
            value={oor}
            onChange={setOor as any}
            options={['SUSPEND', 'SNAP', 'WARN'] as OutOfRangeAction[]}
            labelMap={OOR_LABELS as any}
            inheritedValue={sysDefault.outOfRangeAction as string}
          />
        </div>

        <div className="flex gap-2 p-4 border-t bg-gray-50 sticky bottom-0">
          <Button variant="ghost" onClick={onClose} className="flex-1">إلغاء</Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} className="flex-1">
            حفظ التغييرات
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Single-field "inherit / pick value" radio group. Identical UX for both
 * mode and out-of-range action.
 */
function OverrideField<T extends string>({
  label,
  value,
  onChange,
  options,
  labelMap,
  inheritedValue,
}: {
  label: string;
  value: T | null;
  onChange: (v: T | null) => void;
  options: T[];
  labelMap: Record<T, string>;
  inheritedValue: string;
}) {
  return (
    <div>
      <label className="text-sm font-bold text-gray-900 block mb-2">{label}</label>
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" checked={value === null} onChange={() => onChange(null)} />
          <span className="text-sm text-gray-700">
            موروث (افتراضي النظام: <strong>{labelMap[inheritedValue as T] ?? inheritedValue}</strong>)
          </span>
        </label>
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={value === opt} onChange={() => onChange(opt)} />
            <span className="text-sm text-gray-700">{labelMap[opt]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
