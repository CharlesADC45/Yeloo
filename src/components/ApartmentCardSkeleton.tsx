import { Skeleton } from "./ui/skeleton";

export function ApartmentCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border">
      <Skeleton className="h-48 w-full rounded-none" />
      
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-20" />
        </div>
        
        <Skeleton className="h-4 w-32" />
        
        <div className="flex items-center space-x-4 pt-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}