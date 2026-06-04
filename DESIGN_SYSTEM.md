# Jmart Design System

Single source of truth for visual identity across **admin**, **farmer/buyer portal**, and **mobile**.

---

## 🎨 Brand color

All three apps anchor on **emerald green `#16a34a`** (Tailwind `brand-600`).

| Token | Hex | Usage |
|---|---|---|
| `brand-50`  | `#f0fdf4` | Lightest tints, hover backgrounds |
| `brand-100` | `#dcfce7` | Active-state backgrounds, success chips |
| `brand-500` | `#22c55e` | Secondary accents, charts |
| **`brand-600`** | **`#16a34a`** | **Primary brand, CTAs, links** |
| `brand-700` | `#15803d` | Hover state for primary CTAs |
| `brand-800` | `#166534` | Headers on dark hero sections |

**Source files:**
- `apps/admin/tailwind.config.ts`
- `apps/farmer/tailwind.config.ts`
- `apps/mobile/lib/theme.ts`

Changing the brand means editing all three files (they share documentation comments referencing each other).

---

## 🔤 Typography

| App | Primary font | Fallback |
|---|---|---|
| admin | Tajawal | Inter → system-ui |
| farmer | Tajawal | Inter → system-ui |
| mobile | system | (RN system font) |

Tajawal renders Arabic + Latin with consistent metrics. Both web apps preload it via `<link>` in their root layout.

---

## 🧩 Component primitives

Same file, same variant names, in both web apps:

| Component | admin path | farmer path | Variants |
|---|---|---|---|
| Button | `src/components/ui/Button.tsx` | `src/components/ui/Button.tsx` | primary / secondary / danger / ghost / success |
| Badge  | `src/components/ui/Badge.tsx`  | `src/components/ui/Badge.tsx`  | default / blue / green / yellow / red / purple / indigo / orange / teal |
| Card   | `src/components/ui/Card.tsx`   | `src/components/ui/Card.tsx`   | default + noPadding |
| Spinner | `src/components/ui/Spinner.tsx` | `src/components/ui/Spinner.tsx` | sm / md / lg |

If you add a variant in one, add it in the other.

**Mobile equivalents:**
- `apps/mobile/components/ui/Button.tsx`
- `apps/mobile/components/ui/Badge.tsx` (uses `STATUS_MAP` from `lib/utils.ts`)
- `apps/mobile/components/ui/Card.tsx`
- `apps/mobile/components/ui/LoadingSpinner.tsx`

---

## 🚦 Status color mapping

All three apps use **one** mapping for business statuses (orders, lots, contracts, etc.).
The canonical version lives in:

- `apps/admin/src/components/shared/StatusBadge.tsx` — bilingual (ar + en)
- `apps/farmer/src/lib/utils.ts` (via inline `statusInfo`) — ar only
- `apps/mobile/lib/utils.ts` (`STATUS_MAP`) — ar only

Same Prisma enum keys, same color choices. To add a new status, update all three.

---

## 📐 Layout primitives

| Concept | admin | farmer |
|---|---|---|
| Sidebar | `lg:w-60`, slides as drawer below `lg` | Top nav (no sidebar — consumer style) |
| Header sticky `h-14` | ✅ | ✅ |
| Card radius | `rounded-xl` (12px) | `rounded-xl` for utility, `rounded-2xl` for hero |
| Spacing scale | Tailwind defaults | Tailwind defaults |

Marketplace consumer flows in farmer (`marketplace/_client.tsx`) intentionally use a richer
visual treatment (gradients, emoji, `rounded-2xl`, vivid backgrounds) to match e-commerce
conventions buyers expect. This is **deliberate divergence**, not inconsistency.

---

## ✅ What's unified

- Brand color (#16a34a everywhere)
- Font (Tajawal everywhere)
- Button + Badge + Card + Spinner signatures across both web apps
- Status badge colors + Prisma-enum-matched values
- Mobile theme colors match web brand
- Loading spinner uses `text-brand-600` everywhere

## 🎭 What's intentionally different

- **admin**: clean utility shell, dense tables, bilingual toggle
- **farmer/buyer marketplace**: rich e-commerce visuals (carousel banners, emoji-led categories, gradient hero strips)
- **mobile**: native tab bar, card-based feed, Arabic-only

These are different products for different audiences. Sharing the brand + primitives gives
visual unity without forcing functional sameness.
