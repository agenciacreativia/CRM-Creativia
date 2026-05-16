export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 bg-gray-200 rounded" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-32 bg-gray-200 rounded" />
          <div className="h-9 w-28 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-72 bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-3 w-32 bg-gray-100 rounded mb-3" />
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="bg-white border border-gray-200 rounded p-3 border-l-4 border-l-gray-300">
                <div className="h-3 w-32 bg-gray-200 rounded mb-2" />
                <div className="h-2 w-24 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
