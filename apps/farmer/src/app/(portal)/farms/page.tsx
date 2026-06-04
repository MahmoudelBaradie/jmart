import dynamic from 'next/dynamic';

// Skeleton shown on server and while the client bundle loads
function FarmsSkeleton() {
  return (
    <div className="min-h-screen bg-gray-100 -m-6">
      <div className="h-56 bg-emerald-600 animate-pulse" />
      <div className="max-w-5xl mx-auto px-6 -mt-8 mb-6">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse h-72" />
        ))}
      </div>
    </div>
  );
}

// ssr: false ensures this component never runs on the server — eliminates hydration mismatch
const FarmsClient = dynamic(() => import('./_client'), {
  ssr: false,
  loading: FarmsSkeleton,
});

export default function FarmsPage() {
  return <FarmsClient />;
}
