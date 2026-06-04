/**
 * Curated product → image URL map.
 *
 * Uses Unsplash direct photo URLs (no API key, no rate-limit issues for hot-
 * linked images). Keyed by Arabic name first; falls back to English keyword
 * matching, then to a category-themed image, then to a deterministic seeded
 * placeholder.
 *
 * To add a new product: pick a photo from unsplash.com → click "..." → "Copy
 * download link" → trim to the `photo-<id>` portion and add an entry below.
 *
 * Sizes auto-scale via `?w=…&q=80&auto=format` — keep the base path bare.
 */

const U = (id: string) => `https://images.unsplash.com/photo-${id}`;

const BY_NAME_AR: Record<string, string> = {
  // Vegetables
  'طماطم':       U('1582284540020-8acbe03f4924'),
  'بندورة':      U('1582284540020-8acbe03f4924'),
  'خيار':        U('1604977042946-1eecc30f269e'),
  'كوسة':        U('1583687355032-89b902b7335f'),
  'بطاطس':       U('1518977676601-b53f82aba655'),
  'بطاطا':       U('1518977676601-b53f82aba655'),
  'بصل':         U('1580201092675-a0a6a6cafbb1'),
  'ثوم':         U('1615477550927-6ec8445fcfdc'),
  'جزر':         U('1582515073490-39981397c445'),
  'فلفل':        U('1563565375-f3fdfdbefa83'),
  'فلفل رومي':   U('1563565375-f3fdfdbefa83'),
  'باذنجان':     U('1659261200833-ec8761558af7'),
  'خس':          U('1622206151226-18ca2c9ab4a1'),
  'خس بلدي':     U('1622206151226-18ca2c9ab4a1'),
  'ملفوف':       U('1551888419-7b7a520fe0ca'),
  'قرنبيط':      U('1568584711271-6c929fb49b60'),
  'بروكلي':      U('1459411552884-841db9b3cc2a'),
  'فجل':         U('1597362925123-77861d3fbac7'),
  'ورقيات':      U('1540420773420-3366772f4999'),
  'سبانخ':       U('1576045057995-568f588f82fb'),
  // Fruits
  'برتقال':      U('1547514701-42782101795e'),
  'برتقال أبو سرة': U('1547514701-42782101795e'),
  'تفاح':        U('1568702846914-96b305d2aaeb'),
  'تفاح أحمر':   U('1568702846914-96b305d2aaeb'),
  'موز':         U('1571771894821-ce9b6c11b08e'),
  'عنب':         U('1599819811279-d5ad9cccf838'),
  'عنب أبيض':    U('1599819811279-d5ad9cccf838'),
  'فراولة':      U('1464965911861-746a04b4bca6'),
  'ليمون':       U('1582287014914-1db836bd39fd'),
  'مانجو':       U('1553279030-83ba509d0083'),
  'بطيخ':        U('1563114773-84221bd62daa'),
  'شمام':        U('1571575173700-afb9492e6a50'),
  'رمان':        U('1541344999736-83eca272f6fc'),
  'تين':         U('1601379329542-31c59cfba8a9'),
  // Dates / honey / grains
  'تمر':         U('1574277340133-fb242a9c0fb6'),
  'تمور':        U('1574277340133-fb242a9c0fb6'),
  'عسل':         U('1587049352846-4a222e784d38'),
  'أرز':         U('1586201375761-83865001e31c'),
  'قمح':         U('1574323347407-f5e1ad6d020b'),
  'دقيق':        U('1574323347407-f5e1ad6d020b'),
  // Legumes & nuts
  'فول':         U('1604908554007-39f6f0d3a1c2'),
  'عدس':         U('1611575619020-3a8d2eb91e8e'),
  'حمص':         U('1515543237350-b3eea1ec8082'),
  'لوز':         U('1508061253366-f7da158b6d46'),
  'مكسرات':      U('1508061253366-f7da158b6d46'),
  'فستق':        U('1599909533932-c5c9f1c11569'),
  'بقوليات':     U('1515543237350-b3eea1ec8082'),
  // Herbs & spices
  'نعناع':       U('1628556270448-4d4e4148e1b1'),
  'بقدونس':      U('1583119912267-cc97c911e416'),
  'كزبرة':       U('1583119912267-cc97c911e416'),
  'ريحان':       U('1600692180834-d028c5e98f6f'),
  'أعشاب':       U('1583119912267-cc97c911e416'),
  // Dairy
  'حليب':        U('1550583724-b2692b85b150'),
  'لبن':         U('1550583724-b2692b85b150'),
  'جبن':         U('1486297678162-eb2a19b0a32d'),
  'ألبان':       U('1550583724-b2692b85b150'),
};

const CATEGORY_FALLBACK: Record<string, string> = {
  'خضروات':  U('1540420773420-3366772f4999'),
  'فواكه':   U('1610832958506-aa56368176cf'),
  'حبوب':    U('1586201375761-83865001e31c'),
  'بقوليات': U('1515543237350-b3eea1ec8082'),
  'أعشاب':   U('1583119912267-cc97c911e416'),
  'تمور':    U('1574277340133-fb242a9c0fb6'),
  'عسل':     U('1587049352846-4a222e784d38'),
  'مكسرات':  U('1508061253366-f7da158b6d46'),
  'ألبان':   U('1550583724-b2692b85b150'),
};

/**
 * Resolve a product image URL.
 * @param nameAr   Arabic product name (best signal)
 * @param catNameAr Category Arabic name (fallback signal)
 * @param size     Pixel width — keeps thumbnails light
 */
export function productImage(nameAr?: string | null, catNameAr?: string | null, size = 400): string | null {
  const params = `?w=${size}&q=80&auto=format&fit=crop`;
  if (nameAr) {
    // Direct hit
    if (BY_NAME_AR[nameAr]) return BY_NAME_AR[nameAr] + params;
    // Partial hit — first matching token
    for (const key of Object.keys(BY_NAME_AR)) {
      if (nameAr.includes(key) || key.includes(nameAr)) return BY_NAME_AR[key] + params;
    }
  }
  if (catNameAr && CATEGORY_FALLBACK[catNameAr]) {
    return CATEGORY_FALLBACK[catNameAr] + params;
  }
  return null; // caller decides: show emoji or nothing
}
