
function SubmissionsSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10">
        <Skeleton className="h-4 w-32 mb-6" />
        <div className="mb-10 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[64px_minmax(0,2.4fr)_1fr_1fr_1fr_1.4fr] gap-4 px-6 py-3 border-b border-border bg-foreground/5">
            {["Rank", "Candidate", "Submitted", "Answer Score", "CV Score", "Actions"].map((h) => (
              <Skeleton key={h} className="h-3 w-20" />
            ))}
          </div>
          <div className="divide-y divide-border">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="px-6 py-4 grid grid-cols-1 md:grid-cols-[64px_minmax(0,2.4fr)_1fr_1fr_1fr_1.4fr] gap-2 md:gap-4 items-center"
              >
                <Skeleton className="h-7 w-7 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-16 rounded-full mx-auto" />
                <Skeleton className="h-6 w-16 rounded-full mx-auto" />
                <div className="flex md:justify-end items-center gap-2">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
