import dynamic from 'next/dynamic';

function MarketplaceSkeleton() {
  return (
    <div className="min-h-screen bg-gray-100 -mx-4 -mt-4">
      <div className="h-16 bg-emerald-700 animate-pulse" />
      <div className="h-10 bg-emerald-800 animate-pulse opacity-60" />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse h-64" />
          ))}
        </div>
      </div>
    </div>
  );
}

const MarketplaceClient = dynamic(() => import('./_client'), {
  ssr: false,
  loading: MarketplaceSkeleton,
});

export default function MarketplacePage() {
  return <MarketplaceClient />;
}
