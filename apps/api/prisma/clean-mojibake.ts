/**
 * One-off cleanup for rows whose Arabic text was double-encoded or written
 * as `???? ?????`. Caused by PowerShell terminals using cp1256 → being
 * stringified before Prisma got the chance to round-trip them as UTF-8.
 *
 * Detection: any row whose text-y columns either match /\?{3,}/ or contain
 * the Unicode replacement char `�`.
 *
 * Mode: dry-run by default. Pass `--apply` to commit.
 *
 *   pnpm tsx prisma/clean-mojibake.ts          # preview
 *   pnpm tsx prisma/clean-mojibake.ts --apply  # commit
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const broken = (s?: string | null) =>
  !!s && (/\?{3,}/.test(s) || /�/.test(s));

async function scan<T extends { id: string }>(
  label: string,
  rows: T[],
  fields: (keyof T)[],
): Promise<{ id: string; reason: string }[]> {
  const bad: { id: string; reason: string }[] = [];
  for (const r of rows) {
    for (const f of fields) {
      const v = r[f] as unknown as string | null;
      if (broken(v)) {
        bad.push({ id: r.id, reason: `${label}.${String(f)} = "${v}"` });
        break;
      }
    }
  }
  return bad;
}

async function main() {
  const summary: string[] = [];

  const products = await prisma.product.findMany({ select: { id: true, name: true, nameAr: true } });
  const badProducts = await scan('product', products, ['name', 'nameAr']);
  summary.push(`Products  : ${badProducts.length} / ${products.length}`);

  const cats = await prisma.productCategory.findMany({ select: { id: true, name: true, nameAr: true } });
  const badCats = await scan('category', cats, ['name', 'nameAr']);
  summary.push(`Categories: ${badCats.length} / ${cats.length}`);

  const farms = await prisma.farmerFarm.findMany({ select: { id: true, farmName: true, address: true } });
  const badFarms = await scan('farm', farms, ['farmName', 'address']);
  summary.push(`Farms     : ${badFarms.length} / ${farms.length}`);

  const branches = await prisma.buyerBranch.findMany({ select: { id: true, branchName: true, address: true, contactName: true, deliveryNotes: true } });
  const badBranches = await scan('branch', branches, ['branchName', 'address', 'contactName', 'deliveryNotes']);
  summary.push(`Branches  : ${badBranches.length} / ${branches.length}`);

  const lots = await prisma.inventoryLot.findMany({ select: { id: true, batchNotes: true } });
  const badLots = await scan('lot', lots, ['batchNotes']);
  summary.push(`Lots      : ${badLots.length} / ${lots.length}`);

  const posts = await prisma.socialPost.findMany({ select: { id: true, content: true } });
  const badPosts = await scan('post', posts, ['content']);
  summary.push(`Posts     : ${badPosts.length} / ${posts.length}`);

  console.log(summary.join('\n'));

  const total = badProducts.length + badCats.length + badFarms.length + badBranches.length + badLots.length + badPosts.length;
  console.log(`\nTotal broken rows: ${total}\n`);

  if (!APPLY) {
    console.log('DRY-RUN. Re-run with --apply to delete.');
    return;
  }

  // We delete the broken seed rows rather than guess-decode them — the
  // original Arabic intent isn't recoverable from `???` mojibake.
  console.log('Deleting broken rows…');
  if (badProducts.length) await prisma.product.deleteMany({ where: { id: { in: badProducts.map((b) => b.id) } } });
  if (badCats.length)     await prisma.productCategory.deleteMany({ where: { id: { in: badCats.map((b) => b.id) } } });
  if (badPosts.length)    await prisma.socialPost.deleteMany({ where: { id: { in: badPosts.map((b) => b.id) } } });
  if (badLots.length)     await prisma.inventoryLot.deleteMany({ where: { id: { in: badLots.map((b) => b.id) } } });
  // Farms / branches are referenced by lots and orders — null out the
  // broken display fields instead of cascading deletes.
  for (const f of badFarms) {
    await prisma.farmerFarm.update({ where: { id: f.id }, data: { farmName: '[needs-rename]', address: '[needs-rename]' } }).catch(() => null);
  }
  for (const b of badBranches) {
    await prisma.buyerBranch.update({ where: { id: b.id }, data: { branchName: '[needs-rename]', address: '[needs-rename]', contactName: '', deliveryNotes: '' } }).catch(() => null);
  }
  console.log(`Done. ${total} rows cleaned.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
