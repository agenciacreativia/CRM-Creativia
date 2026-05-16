export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-56 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="h-7 w-48 bg-gray-200 rounded" />
          <div className="h-7 w-24 bg-gray-200 rounded" />
        </div>
        <div className="grid grid-cols-7 border-t border-gray-100">
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={i} className="min-h-[80px] border-b border-r border-gray-100 p-2">
              <div className="h-3 w-5 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
