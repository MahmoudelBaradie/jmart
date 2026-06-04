/**
 * Build a self-contained HTML gallery embedding every PNG in /img as base64.
 * Output: gallery.html — a single file you can email / share / open offline.
 */
const fs = require('fs');
const path = require('path');

const IMG = path.join(__dirname, 'img');
const OUT = path.join(__dirname, 'gallery.html');

const groups = [
  {
    key: 'mobile',
    title: '📱 تطبيق الموبايل',
    sub: 'Expo · React Native — 7 شاشات',
    pillBg: '#16a34a',
    isPhone: true,
  },
  {
    key: 'portal',
    title: '🌾🛒 بوابة المزرعة والمشتري',
    sub: 'Next.js — 10 شاشات',
    pillBg: '#0ea5e9',
    isPhone: false,
  },
  {
    key: 'admin',
    title: '🖥️ لوحة الإدارة',
    sub: 'Operations Panel — 12 شاشة',
    pillBg: '#7c3aed',
    isPhone: false,
  },
];

const labelAr = {
  '01-home':           'الرئيسية',
  '02-marketplace':    'السوق',
  '03-listings':       'عروضي',
  '04-orders':         'الطلبات',
  '05-more':           'المزيد',
  '06-profile':        'الملف الشخصي',
  '07-notifications':  'الإشعارات',
  '05-community':      'المجتمع',
  '06-my-farms':       'مزارعي',
  '07-addresses':      'عناويني',
  '08-contracts':      'العقود',
  '09-disputes':       'النزاعات',
  '10-farms':          'المزارع',
  '01-dashboard':      'لوحة المعلومات',
  '02-orders':         'الطلبات',
  '03-categories':     'الأصناف',
  '04-banners':        'بنرات السوق',
  '05-farmers':        'المزارعون',
  '06-buyers':         'المشترون',
  '07-products':       'المنتجات',
  '08-disputes':       'النزاعات',
  '09-contracts':      'العقود',
  '10-logistics':      'اللوجستيات',
  '11-warehouses':     'المستودعات',
  '12-quality':        'الجودة',
};

const allFiles = fs.readdirSync(IMG)
  .filter((f) => f.endsWith('.png'))
  .sort();

function buildGroupHtml(g) {
  const files = allFiles
    .filter((f) => f.startsWith(`${g.key}-`));
  const cards = files.map((f) => {
    const data = fs.readFileSync(path.join(IMG, f));
    const b64 = data.toString('base64');
    const labelKey = f.replace(`${g.key}-`, '').replace('.png', '');
    const label = labelAr[labelKey] ?? labelKey;
    const cls = g.isPhone ? 'phone' : 'browser';
    return `
      <figure class="${cls}">
        <div class="${cls}-frame">
          <img src="data:image/png;base64,${b64}" alt="${label}" loading="lazy"/>
        </div>
        <figcaption>${label}<small>${f}</small></figcaption>
      </figure>
    `;
  }).join('\n');

  return `
  <section class="group">
    <div class="group-head">
      <h2>${g.title}</h2>
      <span class="pill" style="background:${g.pillBg}">${g.sub}</span>
    </div>
    <div class="${g.isPhone ? 'grid-phones' : 'grid-browsers'}">${cards}</div>
  </section>
  `;
}

const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Jmart — معرض الشاشات</title>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{
    font-family:'Tajawal',system-ui,sans-serif;
    background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);
    color:#f1f5f9; min-height:100vh;
  }
  header{
    padding:48px 24px 32px; text-align:center;
    background:radial-gradient(circle at 50% 0%,rgba(22,163,74,0.25),transparent 60%);
  }
  .brand{
    display:inline-flex;align-items:center;gap:10px;
    background:#16a34a;color:#fff;
    padding:10px 22px;border-radius:14px;
    font-weight:900;font-size:22px;
    box-shadow:0 6px 24px rgba(22,163,74,0.45);
  }
  h1{font-size:42px;font-weight:900;margin-top:18px;letter-spacing:-0.5px}
  .lede{color:#94a3b8;margin-top:10px;max-width:680px;margin-inline:auto;font-size:16px;line-height:1.6}
  .stats{display:inline-flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:22px}
  .stat{
    background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
    padding:8px 14px;border-radius:999px;font-size:13px;font-weight:700;color:#cbd5e1;
  }
  .stat b{color:#16a34a;margin-inline-end:4px}

  .group{padding:36px 24px;max-width:1600px;margin:0 auto}
  .group-head{
    display:flex;align-items:center;gap:14px;
    margin-bottom:22px;padding-bottom:14px;
    border-bottom:2px solid #1e293b;
  }
  .group-head h2{font-size:26px;font-weight:900}
  .pill{
    color:#fff;padding:5px 12px;border-radius:10px;
    font-size:12px;font-weight:800;
  }

  /* Phones — vertical cards, simulated bezel */
  .grid-phones{
    display:grid;
    grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
    gap:32px;
  }
  .phone{display:flex;flex-direction:column;align-items:center}
  .phone-frame{
    background:#000;
    border-radius:38px;
    padding:10px 8px 14px;
    box-shadow:0 14px 40px rgba(0,0,0,0.5);
    position:relative;
    transition:transform 0.25s;
    width:100%;max-width:280px;
  }
  .phone-frame:hover{transform:translateY(-6px)}
  .phone-frame::before{
    content:'';position:absolute;top:14px;left:50%;transform:translateX(-50%);
    width:78px;height:18px;background:#000;border-radius:0 0 14px 14px;z-index:2;
  }
  .phone-frame img{
    width:100%;display:block;border-radius:30px;background:#fdfaf3;
  }

  /* Browsers — horizontal cards with title bar */
  .grid-browsers{
    display:grid;
    grid-template-columns:repeat(auto-fill,minmax(480px,1fr));
    gap:28px;
  }
  .browser{display:flex;flex-direction:column}
  .browser-frame{
    background:#0f172a;
    border-radius:14px;overflow:hidden;
    box-shadow:0 12px 36px rgba(0,0,0,0.5);
    border:1px solid rgba(255,255,255,0.08);
    transition:transform 0.25s;
  }
  .browser-frame:hover{transform:translateY(-4px)}
  .browser-frame::before{
    content:'• • •';
    display:block;
    background:#1e293b;
    padding:10px 18px;
    font-size:14px;color:#475569;
    letter-spacing:8px;
    border-bottom:1px solid rgba(255,255,255,0.04);
  }
  .browser-frame img{width:100%;display:block;background:#fff}

  figcaption{
    text-align:center;margin-top:14px;
    font-size:14px;font-weight:800;color:#e2e8f0;
  }
  figcaption small{
    display:block;color:#64748b;font-weight:500;font-size:11px;
    margin-top:3px;direction:ltr;font-family:'Courier New',monospace;
  }

  footer{
    padding:36px 24px;text-align:center;
    color:#64748b;font-size:13px;line-height:1.8;
    border-top:1px solid #1e293b;margin-top:48px;
  }
  footer code{
    background:#1e293b;padding:3px 8px;border-radius:5px;
    font-family:'Courier New',monospace;color:#cbd5e1;
  }

  @media (max-width: 600px){
    h1{font-size:30px}
    .group{padding:24px 12px}
    .grid-phones{grid-template-columns:1fr 1fr;gap:14px}
    .grid-browsers{grid-template-columns:1fr;gap:18px}
  }
</style>
</head>
<body>

<header>
  <div class="brand">🍃 جمارت</div>
  <h1>معرض شاشات النظام</h1>
  <p class="lede">
    لقطات شاشة كاملة لكل واجهات Jmart — الموبايل، بوابة المزرعة/المشتري، ولوحة الإدارة.
    <br>
    ملف واحد قائم بذاته — جاهز للمشاركة والإرسال.
  </p>
  <div class="stats">
    <span class="stat"><b>${allFiles.length}</b> لقطة</span>
    <span class="stat"><b>3</b> تطبيقات</span>
    <span class="stat"><b>📱</b> Mobile</span>
    <span class="stat"><b>🌾🛒</b> Portal</span>
    <span class="stat"><b>🖥️</b> Admin</span>
  </div>
</header>

${groups.map(buildGroupHtml).join('\n')}

<footer>
  <p>
    Jmart Screenshot Gallery · تم التوليد تلقائياً
    <br>
    <code>${new Date().toLocaleString('ar-SA')}</code>
  </p>
  <p style="margin-top:12px">
    لإعادة توليد اللقطات: <code>cd _screenshots && node capture.js && node build-gallery.js</code>
  </p>
</footer>

</body>
</html>
`;

fs.writeFileSync(OUT, html, 'utf8');
const sizeKB = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`✅ Gallery built: ${OUT}`);
console.log(`📦 Size: ${sizeKB} KB · ${allFiles.length} images embedded`);
