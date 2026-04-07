type SkeletonProps = {
  className?: string;
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden className={cx("yeloo-skeleton-base", className)} />;
}

export function SectionHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4">
      <Skeleton className="h-7 w-64 rounded-xl" />
      <Skeleton className="h-5 w-20 rounded-full" />
    </div>
  );
}

export function PropertyCarouselSkeleton({
  count = 4,
  compact = false,
}: {
  count?: number;
  compact?: boolean;
}) {
  return (
    <div className="mt-4 flex gap-4 overflow-hidden pb-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cx(
            "flex-shrink-0",
            compact ? "w-[220px] sm:w-[240px] lg:w-[260px]" : "w-[260px] sm:w-[300px] lg:w-[340px]"
          )}
        >
          <Skeleton
            className={cx(
              "w-full rounded-3xl",
              compact ? "h-56 sm:h-60 lg:h-64" : "h-72 sm:h-80 lg:h-[420px]"
            )}
          />
          <div className="mt-3 space-y-2">
            <Skeleton className="h-5 w-[82%] rounded-lg" />
            <Skeleton className="h-4 w-[58%] rounded-lg" />
            <Skeleton className="h-4 w-[44%] rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PropertyGridSkeleton({
  count = 8,
  compact = true,
}: {
  count?: number;
  compact?: boolean;
}) {
  return (
    <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-[1.7rem] bg-white">
          <Skeleton
            className={cx(
              "w-full rounded-[1.7rem]",
              compact ? "h-56 sm:h-60 lg:h-64" : "h-64 sm:h-72"
            )}
          />
          <div className="space-y-2 px-1 pt-3">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-5 w-[72%] rounded-lg" />
              <Skeleton className="h-4 w-10 rounded-full" />
            </div>
            <Skeleton className="h-4 w-[46%] rounded-lg" />
            <Skeleton className="h-4 w-[56%] rounded-lg" />
            <Skeleton className="h-5 w-[42%] rounded-lg" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-9 w-72 rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-40 rounded-full" />
            <Skeleton className="h-6 w-40 rounded-full" />
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-soft">
          <Skeleton className="h-4 w-20 rounded-lg" />
          <Skeleton className="mt-2 h-8 w-32 rounded-lg" />
          <Skeleton className="mt-2 h-4 w-16 rounded-lg" />
        </div>
      </div>

      <Skeleton className="h-[320px] rounded-3xl sm:h-[420px] lg:h-[520px]" />

      <div className="grid gap-6 lg:grid-cols-[2.4fr_1fr]">
        <div className="space-y-5 rounded-3xl border border-neutral-200 bg-white p-6 shadow-soft">
          <Skeleton className="h-5 w-24 rounded-lg" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-28 rounded-lg" />
              <Skeleton className="h-4 w-20 rounded-lg" />
            </div>
          ))}
          <Skeleton className="h-12 w-full rounded-full" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    </div>
  );
}

export function MapResultsSkeleton() {
  return (
    <div className="space-y-5">
      <div>
        <Skeleton className="h-7 w-48 rounded-xl" />
        <Skeleton className="mt-2 h-4 w-72 rounded-lg" />
      </div>
      <div className="hide-scrollbar flex gap-2 overflow-hidden pb-1">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-5 w-28 rounded-lg" />
      </div>
      <Skeleton className="h-[360px] rounded-[1.6rem]" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[1.4rem] border border-neutral-200 bg-white p-0">
            <Skeleton className="h-56 rounded-t-[1.4rem]" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-5 w-24 rounded-lg" />
              <Skeleton className="h-4 w-32 rounded-lg" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OwnerDashboardSkeleton() {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-44 rounded-xl" />
          <Skeleton className="h-4 w-52 rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-full" />
          <Skeleton className="h-10 w-36 rounded-full" />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-neutral-200 p-4">
            <Skeleton className="h-4 w-24 rounded-lg" />
            <Skeleton className="mt-3 h-8 w-12 rounded-lg" />
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>

      <div className="mt-8 rounded-2xl border border-neutral-200 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-24 rounded-lg" />
            <Skeleton className="h-4 w-48 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-36 rounded-full" />
        </div>
        <div className="mt-4 flex gap-3">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function OwnerListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="mt-6 grid gap-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 px-4 py-3"
        >
          <div className="space-y-2">
            <Skeleton className="h-5 w-52 rounded-lg" />
            <Skeleton className="h-4 w-36 rounded-lg" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-28 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function OwnerProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex items-start gap-5">
            <Skeleton className="h-28 w-28 rounded-full" />
            <div className="space-y-3 pt-1">
              <Skeleton className="h-8 w-52 rounded-xl" />
              <Skeleton className="h-4 w-40 rounded-lg" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex gap-6 border-b border-neutral-200 pb-3">
          <Skeleton className="h-5 w-24 rounded-lg" />
          <Skeleton className="h-5 w-20 rounded-lg" />
          <Skeleton className="h-5 w-24 rounded-lg" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.8fr_0.95fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
            <Skeleton className="h-6 w-48 rounded-xl" />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-28 rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-2xl" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
            <Skeleton className="h-6 w-44 rounded-xl" />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-32 rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-2xl" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-80 rounded-[2rem]" />
          <Skeleton className="h-44 rounded-[2rem]" />
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="rounded-[1.8rem] border border-neutral-200 bg-white p-5 shadow-soft">
            <Skeleton className="h-4 w-28 rounded-lg" />
            <Skeleton className="mt-3 h-8 w-16 rounded-lg" />
            <Skeleton className="mt-4 h-3 w-32 rounded-lg" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <Skeleton className="h-[420px] rounded-[2rem]" />
        <Skeleton className="h-[420px] rounded-[2rem]" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-[320px] rounded-[2rem]" />
        ))}
      </div>
    </div>
  );
}
