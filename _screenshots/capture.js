/**
 * Jmart — Screenshot capture
 *
 * Visits each app screen and saves a PNG into `img/`.
 * Uses your installed Chrome (no Chromium download).
 *
 * Run:    cd C:/Jmart/_screenshots && node capture.js
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// ── Targets ────────────────────────────────────────────────────────────────
// Each app group has its own port and login flow. We open ONE page per group
// to log in, then re-use the same context (cookies + localStorage) for every
// subsequent screen capture within that group.
const APPS = [
  {
    name: 'mobile',
    port: 8081,
    width: 390, height: 844, // iPhone 14 Pro logical px
    login: { email: 'demo@jmart.sa', password: 'Demo@Jmart2026!', kind: 'rn-web' },
    screens: [
      { route: '/',              label: '01-home' },
      { route: '/marketplace',   label: '02-marketplace' },
      { route: '/listings',      label: '03-listings' },
      { route: '/orders',        label: '04-orders' },
      { route: '/more',          label: '05-more' },
      { route: '/profile',       label: '06-profile' },
      { route: '/notifications', label: '07-notifications' },
    ],
  },
  {
    name: 'portal',
    port: 3003,
    width: 1280, height: 800,
    login: { email: 'demo@jmart.sa', password: 'Demo@Jmart2026!', kind: 'web' },
    screens: [
      { route: '/',              label: '01-home' },
      { route: '/marketplace',   label: '02-marketplace' },
      { route: '/listings',      label: '03-listings' },
      { route: '/orders',        label: '04-orders' },
      { route: '/community',     label: '05-community' },
      { route: '/farms/my',      label: '06-my-farms' },
      { route: '/addresses',     label: '07-addresses' },
      { route: '/contracts',     label: '08-contracts' },
      { route: '/disputes',      label: '09-disputes' },
      { route: '/farms',         label: '10-farms' },
    ],
  },
  {
    name: 'admin',
    port: 3002,
    width: 1440, height: 900,
    login: { email: 'admin@jmart.sa', password: 'Admin@Jmart2026!', kind: 'web' },
    screens: [
      { route: '/',           label: '01-dashboard' },
      { route: '/orders',     label: '02-orders' },
      { route: '/categories', label: '03-categories' },
      { route: '/banners',    label: '04-banners' },
      { route: '/farmers',    label: '05-farmers' },
      { route: '/buyers',     label: '06-buyers' },
      { route: '/products',   label: '07-products' },
      { route: '/disputes',   label: '08-disputes' },
      { route: '/contracts',  label: '09-contracts' },
      { route: '/logistics',  label: '10-logistics' },
      { route: '/warehouses', label: '11-warehouses' },
      { route: '/quality',    label: '12-quality' },
    ],
  },
];

// ── Setup output ───────────────────────────────────────────────────────────
const IMG_DIR = path.join(__dirname, 'img');
if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR);

// ── Helpers ────────────────────────────────────────────────────────────────
async function logInPortalOrAdmin(page, email, password) {
  await page.waitForSelector('input[type=email]', { timeout: 8000 });
  // Some forms re-render on input; type slowly to ensure controlled inputs sync.
  await page.click('input[type=email]'); await page.type('input[type=email]', email, { delay: 20 });
  await page.click('input[type=password]'); await page.type('input[type=password]', password, { delay: 20 });

  const clicked = await page.evaluate(() => {
    const submit = document.querySelector('button[type=submit]');
    if (submit) { submit.click(); return 'submit'; }
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      /تسجيل الدخول|Sign in|Login/i.test(b.textContent.trim()),
    );
    if (btn) { btn.click(); return 'label'; }
    return null;
  });
  if (!clicked) throw new Error('No login button found');

  // Wait until URL changes OR the login form goes away (indicates success).
  await page.waitForFunction(() => {
    return !location.pathname.includes('/login')
        || !document.querySelector('input[type=password]');
  }, { timeout: 15000 }).catch(() => {});
  // Settle the SPA after redirect
  await new Promise((r) => setTimeout(r, 1500));
}

async function logInRnWeb(page, email, password) {
  // React-Native-Web renders Pressable as <div role="button">.
  await page.waitForSelector('input', { timeout: 10000 });
  const inputs = await page.$$('input');
  await inputs[0].type(email);
  await inputs[1].type(password);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('div'))
      .find((d) => /تسجيل الدخول|Sign in/.test(d.textContent.trim())
        && d.offsetParent
        && d.getBoundingClientRect().height > 30
        && d.getBoundingClientRect().height < 70);
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const opts = { bubbles: true, cancelable: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, pointerType: 'mouse', pointerId: 1, button: 0 };
    btn.dispatchEvent(new PointerEvent('pointerdown', opts));
    btn.dispatchEvent(new PointerEvent('pointerup', opts));
    btn.dispatchEvent(new MouseEvent('click', opts));
  });
}

async function hideOverlays(page) {
  await page.evaluate(() => {
    // Expo dev overlays
    document.querySelectorAll('*').forEach((el) => {
      const t = (el.textContent || '').trim();
      if (t === 'Refreshing...' || t.includes("Don't see your changes")) {
        el.style.display = 'none';
      }
    });
  }).catch(() => {});
}

async function shoot(page, dest) {
  await hideOverlays(page);
  await new Promise((r) => setTimeout(r, 1200)); // settle animations + images
  await page.screenshot({ path: dest, fullPage: false });
}

// ── Main ──────────────────────────────────────────────────────────────────
(async () => {
  console.log('🚀 Launching Chrome…');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-web-security', '--disable-features=site-per-process'],
  });

  let totalShot = 0;
  for (const app of APPS) {
    console.log(`\n📸 ${app.name.toUpperCase()}  (port ${app.port})`);
    // Newer puppeteer uses createBrowserContext; older uses createIncognitoBrowserContext.
    let ctx;
    if (typeof browser.createBrowserContext === 'function') {
      ctx = await browser.createBrowserContext();
    } else if (typeof browser.createIncognitoBrowserContext === 'function') {
      ctx = await browser.createIncognitoBrowserContext();
    } else {
      ctx = browser.defaultBrowserContext();
    }
    const page = await (ctx.newPage ? ctx.newPage() : browser.newPage());
    await page.setViewport({ width: app.width, height: app.height, deviceScaleFactor: 2 });

    const base = `http://localhost:${app.port}`;
    try {
      // ── login ──
      await page.goto(base, { waitUntil: 'networkidle2', timeout: 30000 });
      try {
        if (app.login.kind === 'rn-web') {
          await logInRnWeb(page, app.login.email, app.login.password);
        } else {
          await logInPortalOrAdmin(page, app.login.email, app.login.password);
        }
        // Wait for redirect / token storage
        await new Promise((r) => setTimeout(r, 2500));
      } catch (e) {
        console.warn(`   ⚠️  login skipped (already in?): ${e.message}`);
      }

      // ── capture each screen ──
      for (const s of app.screens) {
        try {
          await page.goto(`${base}${s.route}`, { waitUntil: 'networkidle2', timeout: 25000 });
          await new Promise((r) => setTimeout(r, 1500));
          const file = path.join(IMG_DIR, `${app.name}-${s.label}.png`);
          await shoot(page, file);
          console.log(`   ✅ ${s.label}`);
          totalShot++;
        } catch (e) {
          console.warn(`   ❌ ${s.label}: ${e.message.split('\n')[0]}`);
        }
      }
    } catch (e) {
      console.error(`   💥 ${app.name} failed: ${e.message}`);
    } finally {
      await page.close().catch(() => {});
      if (ctx.close && ctx !== browser.defaultBrowserContext()) await ctx.close().catch(() => {});
    }
  }

  console.log(`\n🎉 Done: ${totalShot} screenshots saved to ${IMG_DIR}`);
  await browser.close();
  process.exit(0);
})();
