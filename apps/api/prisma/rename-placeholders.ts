/**
 * Replace `[needs-rename]` placeholders left over from the mojibake cleanup
 * with sensible Arabic defaults. Read-modify-write only — never deletes.
 *
 *   pnpm tsx prisma/rename-placeholders.ts          # preview
 *   pnpm tsx prisma/rename-placeholders.ts --apply  # commit
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const PH = '[needs-rename]';
const isPh = (s?: string | null) => !!s && s.trim() === PH;

async function main() {
  let touched = 0;

  // ── Farmer farms ──────────────────────────────────────────────
  const farms = await prisma.farmerFarm.findMany({
    where: { OR: [{ farmName: PH }, { address: PH }] },
    select: { id: true, farmName: true, address: true, farmerId: true },
  });
  for (const f of farms) {
    const data: any = {};
    if (isPh(f.farmName)) data.farmName = `مزرعة الديمو ${f.id.slice(0, 4)}`;
    if (isPh(f.address))  data.address  = 'طريق الملك عبدالعزيز، الرياض';
    if (Object.keys(data).length) {
      touched++;
      console.log(`FarmerFarm  ${f.id}  →  ${JSON.stringify(data)}`);
      if (APPLY) await prisma.farmerFarm.update({ where: { id: f.id }, data });
    }
  }

  // ── Buyer branches ────────────────────────────────────────────
  const branches = await prisma.buyerBranch.findMany({
    where: { OR: [{ branchName: PH }, { address: PH }, { contactName: PH }, { deliveryNotes: PH }] },
    select: { id: true, branchName: true, address: true, contactName: true, deliveryNotes: true },
  });
  for (const b of branches) {
    const data: any = {};
    if (isPh(b.branchName))    data.branchName    = `الفرع الرئيسي ${b.id.slice(0, 4)}`;
    if (isPh(b.address))       data.address       = 'حي النخيل، الرياض';
    if (isPh(b.contactName))   data.contactName   = 'مسؤول التوصيل';
    if (isPh(b.deliveryNotes)) data.deliveryNotes = 'التسليم من البوابة الشرقية';
    if (Object.keys(data).length) {
      touched++;
      console.log(`BuyerBranch ${b.id}  →  ${JSON.stringify(data)}`);
      if (APPLY) await prisma.buyerBranch.update({ where: { id: b.id }, data });
    }
  }

  // ── Defensive sweep on other Arabic display fields ───────────
  // Products / Categories / Posts / GeoZones can theoretically contain the
  // placeholder if someone retypes by hand — replace with neutral text.
  const products = await prisma.product.findMany({
    where: { OR: [{ name: PH }, { nameAr: PH }] },
    select: { id: true, name: true, nameAr: true },
  });
  for (const p of products) {
    const data: any = {};
    if (isPh(p.name))   data.name   = `Product ${p.id.slice(0, 4)}`;
    if (isPh(p.nameAr)) data.nameAr = `منتج ${p.id.slice(0, 4)}`;
    if (Object.keys(data).length) {
      touched++;
      console.log(`Product     ${p.id}  →  ${JSON.stringify(data)}`);
      if (APPLY) await prisma.product.update({ where: { id: p.id }, data });
    }
  }

  const cats = await prisma.productCategory.findMany({
    where: { OR: [{ name: PH }, { nameAr: PH }] },
    select: { id: true, name: true, nameAr: true },
  });
  for (const c of cats) {
    const data: any = {};
    if (isPh(c.name))   data.name   = `Category ${c.id.slice(0, 4)}`;
    if (isPh(c.nameAr)) data.nameAr = `فئة ${c.id.slice(0, 4)}`;
    if (Object.keys(data).length) {
      touched++;
      console.log(`Category    ${c.id}  →  ${JSON.stringify(data)}`);
      if (APPLY) await prisma.productCategory.update({ where: { id: c.id }, data });
    }
  }

  const posts = await prisma.socialPost.findMany({
    where: { content: PH },
    select: { id: true },
  });
  for (const p of posts) {
    touched++;
    console.log(`SocialPost  ${p.id}  →  content`);
    if (APPLY) await prisma.socialPost.update({
      where: { id: p.id }, data: { content: 'منشور تجريبي للديمو' },
    });
  }

  console.log(`\n${touched} placeholder row(s) found.`);
  if (!APPLY && touched > 0) console.log('DRY-RUN. Re-run with --apply to commit.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
