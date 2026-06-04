import dynamic from 'next/dynamic';

function FarmSkeleton() {
  return (
    <div className="min-h-screen bg-gray-100 -m-6 animate-pulse">
      <div className="h-56 bg-emerald-600 opacity-70" />
      <div className="max-w-5xl mx-auto px-6 -mt-8 space-y-4 pt-4">
        <div className="bg-white rounded-2xl h-32" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl h-24" />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="bg-white rounded-2xl h-48" />)}
        </div>
      </div>
    </div>
  );
}

const FarmClient = dynamic(() => import('./_client'), {
  ssr: false,
  loading: FarmSkeleton,
});

export default function FarmProfilePage({ params }: { params: Promise<{ farmId: string }> }) {
  return <FarmClient params={params} />;
}
