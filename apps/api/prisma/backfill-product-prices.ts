/**
 * Backfill `products.price_per_unit` from existing FarmerCatalogItem prices.
 *
 * Uses the MEDIAN of all active farmer prices for each product as the new
 * centralised price. Skips products that already have a price.
 *
 * Dry-run by default. Pass `--apply` to actually write.
 *
 *   pnpm tsx prisma/backfill-product-prices.ts          # dry-run
 *   pnpm tsx prisma/backfill-product-prices.ts --apply  # commit
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes('--apply');

  const products = await prisma.product.findMany({
    where: { pricePerUnit: null, isActive: true },
    include: {
      catalogItems: {
        where: { isListed: true, pricePerUnit: { gt: 0 } },
        select: { pricePerUnit: true },
      },
    },
  });

  console.log(`Found ${products.length} active products without a central price.\n`);
  let updated = 0;
  let skipped = 0;

  for (const p of products) {
    const prices = p.catalogItems.map((c) => Number(c.pricePerUnit)).sort((a, b) => a - b);
    if (prices.length === 0) {
      console.log(`  ⊘ ${p.nameAr ?? p.name}  (no catalog price — needs admin to set manually)`);
      skipped++;
      continue;
    }
    const median = prices.length % 2 === 1
      ? prices[(prices.length - 1) / 2]
      : (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2;

    const decimal = new Prisma.Decimal(median.toFixed(4));
    console.log(`  ✓ ${(p.nameAr ?? p.name).padEnd(30)}  ← ${decimal.toFixed(2)} SAR  (median of ${prices.length})`);

    if (apply) {
      await prisma.product.update({
        where: { id: p.id },
        data: { pricePerUnit: decimal, priceUpdatedAt: new Date() },
      });
      updated++;
    }
  }

  console.log('\n──────────────────────────────────────────');
  if (apply) {
    console.log(`✅ Backfilled ${updated} products. ${skipped} skipped (no catalog data).`);
  } else {
    console.log(`🔍 DRY-RUN. Would backfill ${products.length - skipped} products.`);
    console.log('   Re-run with --apply to commit.');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
